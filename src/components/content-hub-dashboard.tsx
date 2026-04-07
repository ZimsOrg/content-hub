"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useRef, useState, useTransition, type ChangeEvent, type MouseEvent } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Download,
  ImageIcon,
  LayoutGrid,
  Link2,
  LoaderCircle,
  Menu,
  MessageSquareText,
  Moon,
  PanelLeft,
  PencilLine,
  Plus,
  Send,
  Settings2,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useContentHub } from "@/lib/store";
import type {
  ApprovalStatus,
  Idea,
  Platform,
  Post,
  PostPlatform,
  PostType,
  TabId,
  ThemePreference,
} from "@/lib/types";

const LINKEDIN_COLOR = "#0077B5";
const SUBSTACK_COLOR = "#FF6719";

const TAB_ITEMS: {
  id: TabId;
  label: string;
  icon: typeof CalendarDays;
  description: string;
}[] = [
  { id: "board", label: "Board", icon: LayoutGrid, description: "Content pipeline" },
  { id: "calendar", label: "Calendar", icon: CalendarDays, description: "Publishing schedule" },
  { id: "settings", label: "Settings", icon: Settings2, description: "Preferences" },
];

const PLATFORM_META = {
  linkedin: {
    label: "LinkedIn",
    color: LINKEDIN_COLOR,
    pill: "bg-[#0077B5]/12 text-[#0077B5] ring-[#0077B5]/20 dark:bg-[#0077B5]/18",
  },
  substack: {
    label: "Substack",
    color: SUBSTACK_COLOR,
    pill: "bg-[#FF6719]/12 text-[#FF6719] ring-[#FF6719]/20 dark:bg-[#FF6719]/18",
  },
  both: {
    label: "Both",
    color: "var(--foreground)",
    pill: "bg-foreground/8 text-foreground ring-foreground/10",
  },
} as const;

const POST_TYPE_META: Record<PostType, { label: string; dot: string; badge: string }> = {
  trenches: {
    label: "Trenches",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
  contrarian: {
    label: "Contrarian",
    dot: "bg-amber-500",
    badge: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  "tool-review": {
    label: "Tool Review",
    dot: "bg-violet-500",
    badge: "bg-violet-500/12 text-violet-700 ring-violet-500/20 dark:text-violet-300",
  },
  "free-roundup": {
    label: "Free Roundup",
    dot: "bg-teal-500",
    badge: "bg-teal-500/12 text-teal-700 ring-teal-500/20 dark:text-teal-300",
  },
  "paid-deep-dive": {
    label: "Paid Deep Dive",
    dot: "bg-yellow-500",
    badge: "bg-yellow-500/12 text-yellow-700 ring-yellow-500/20 dark:text-yellow-300",
  },
};

const PRIORITY_META = {
  high: {
    label: "High",
    badge: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  },
  medium: {
    label: "Medium",
    badge: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  low: {
    label: "Low",
    badge: "bg-emerald-500/12 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300",
  },
} as const;

const IDEA_STATUS_META = {
  new: "New",
  developing: "Developing",
  ready: "Ready",
} as const;

const POST_STATUS_META = {
  idea: "Idea",
  draft: "Draft",
  review: "Review",
  approved: "Approved",
  posted: "Posted",
} as const;

const APPROVAL_STATUS_META = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  "needs-revision": "Needs Revision",
} as const;

const APPROVAL_ACTIONS: {
  value: ApprovalStatus;
  label: string;
  requireComment: boolean;
}[] = [
  { value: "approved", label: "Approve", requireComment: false },
  { value: "needs-revision", label: "Needs Revision", requireComment: true },
  { value: "rejected", label: "Reject", requireComment: true },
];

const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

function parseTab(value: string | null): TabId {
  return TAB_ITEMS.some((tab) => tab.id === value) ? (value as TabId) : "board";
}

function getPlatformColor(platform: PostPlatform) {
  return PLATFORM_META[platform].color;
}

function formatDayLabel(date: Date) {
  return format(date, "EEE, MMM d");
}

function getImageDownloadName(post: Post) {
  const pathname = post.imageUrl ? new URL(post.imageUrl, "https://content-hub.local").pathname : "";
  const extension = pathname.split(".").pop()?.split("?")[0];
  const slug = post.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  return extension
    ? `${slug || "content-hub-image"}.${extension}`
    : `${slug || "content-hub-image"}.jpg`;
}

// ---------------------------------------------------------------------------
// Fullscreen Image Viewer
// ---------------------------------------------------------------------------

const ImageViewerContext = createContext<{
  openImage: (src: string, alt?: string) => void;
}>({ openImage: () => {} });

function useImageViewer() {
  return useContext(ImageViewerContext);
}

function ImageViewerOverlay({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const lastTouchRef = useRef<{ dist: number; x: number; y: number; scale: number; tx: number; ty: number } | null>(null);
  const lastTapRef = useRef(0);
  const imgRef = useRef<HTMLDivElement>(null);

  function resetTransform() {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }

  function handleTouchStart(event: React.TouchEvent) {
    if (event.touches.length === 2) {
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      lastTouchRef.current = {
        dist: Math.hypot(dx, dy),
        x: (event.touches[0].clientX + event.touches[1].clientX) / 2,
        y: (event.touches[0].clientY + event.touches[1].clientY) / 2,
        scale,
        tx: translate.x,
        ty: translate.y,
      };
    } else if (event.touches.length === 1 && scale > 1) {
      lastTouchRef.current = {
        dist: 0,
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        scale,
        tx: translate.x,
        ty: translate.y,
      };
    }
  }

  function handleTouchMove(event: React.TouchEvent) {
    if (!lastTouchRef.current) return;

    if (event.touches.length === 2) {
      event.preventDefault();
      const dx = event.touches[0].clientX - event.touches[1].clientX;
      const dy = event.touches[0].clientY - event.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(Math.max(lastTouchRef.current.scale * (dist / lastTouchRef.current.dist), 1), 5);
      setScale(newScale);

      const mx = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const my = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      setTranslate({
        x: lastTouchRef.current.tx + (mx - lastTouchRef.current.x),
        y: lastTouchRef.current.ty + (my - lastTouchRef.current.y),
      });
    } else if (event.touches.length === 1 && scale > 1) {
      const dx = event.touches[0].clientX - lastTouchRef.current.x;
      const dy = event.touches[0].clientY - lastTouchRef.current.y;
      setTranslate({
        x: lastTouchRef.current.tx + dx,
        y: lastTouchRef.current.ty + dy,
      });
    }
  }

  function handleTouchEnd(event: React.TouchEvent) {
    if (event.touches.length === 0) {
      // All fingers lifted — keep current zoom, just stop tracking
      lastTouchRef.current = null;
    } else if (event.touches.length === 1) {
      // Went from 2 fingers to 1 — switch to pan mode
      lastTouchRef.current = {
        dist: 0,
        x: event.touches[0].clientX,
        y: event.touches[0].clientY,
        scale,
        tx: translate.x,
        ty: translate.y,
      };
    }
  }

  function handleDoubleTap(event: React.TouchEvent) {
    const now = Date.now();
    if (now - lastTapRef.current < 300) {
      event.preventDefault();
      if (scale > 1) {
        resetTransform();
      } else {
        setScale(2.5);
        const rect = imgRef.current?.getBoundingClientRect();
        if (rect) {
          const cx = event.changedTouches[0].clientX - rect.left - rect.width / 2;
          const cy = event.changedTouches[0].clientY - rect.top - rect.height / 2;
          setTranslate({ x: -cx * 1.5, y: -cy * 1.5 });
        }
      }
    }
    lastTapRef.current = now;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
      onClick={() => { if (scale <= 1) onClose(); }}
      role="dialog"
      aria-label={alt || "Image viewer"}
    >
      <button
        type="button"
        className="absolute top-[max(env(safe-area-inset-top,12px),12px)] right-4 z-10 flex size-12 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur transition active:bg-white/30"
        onClick={(event) => { event.stopPropagation(); onClose(); }}
        aria-label="Close"
      >
        <X className="size-6" />
      </button>

      <p className="absolute bottom-[max(env(safe-area-inset-bottom,12px),12px)] left-0 right-0 text-center text-sm text-white/50">
        {scale <= 1 ? "Double-tap to zoom · Pinch to zoom" : `${Math.round(scale * 100)}%`}
      </p>

      <div
        ref={imgRef}
        className="flex h-full w-full items-center justify-center overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={(event) => { handleTouchEnd(event); handleDoubleTap(event); }}
        style={{ touchAction: "none" }}
      >
        {isVideo(src) ? (
          <video
            src={src}
            className="max-h-full max-w-full object-contain transition-transform"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transitionDuration: lastTouchRef.current ? "0ms" : "200ms",
            }}
            autoPlay
            loop
            muted
            playsInline
            controls
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={alt}
            className="max-h-full max-w-full object-contain transition-transform"
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transitionDuration: lastTouchRef.current ? "0ms" : "200ms",
            }}
            draggable={false}
            onClick={(event) => event.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}

function ImageViewerProvider({ children }: { children: React.ReactNode }) {
  const [src, setSrc] = useState<string | null>(null);
  const [alt, setAlt] = useState("");

  function openImage(nextSrc: string, nextAlt?: string) {
    setSrc(nextSrc);
    setAlt(nextAlt ?? "");
  }

  return (
    <ImageViewerContext.Provider value={{ openImage }}>
      {children}
      {src ? <ImageViewerOverlay src={src} alt={alt} onClose={() => setSrc(null)} /> : null}
    </ImageViewerContext.Provider>
  );
}

function isVideo(src: string) {
  return /\.(mp4|webm|mov)(\?|$)/i.test(src);
}

function isGif(src: string) {
  return /\.gif(\?|$)/i.test(src);
}

function TappableMedia({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { openImage } = useImageViewer();

  if (isVideo(src)) {
    return (
      <video
        src={src}
        className={cn("cursor-pointer", className)}
        onClick={() => openImage(src, alt)}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
      />
    );
  }

  // GIFs and regular images — use img tag (GIFs auto-animate)
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={cn("cursor-pointer", className)}
      onClick={() => openImage(src, alt)}
    />
  );
}

// Keep backward compat alias
const TappableImage = TappableMedia;

function safeNumber(value: number | undefined) {
  return value ?? 0;
}

function postMatchesDate(post: Post, date: Date) {
  return isSameDay(parseISO(post.scheduledAt), date);
}

function sortPostsByDate(posts: Post[]) {
  return [...posts].sort(
    (left, right) => parseISO(left.scheduledAt).getTime() - parseISO(right.scheduledAt).getTime(),
  );
}

function sortIdeasByPriority(ideas: Idea[]) {
  const order = { high: 0, medium: 1, low: 2 };
  return [...ideas].sort((left, right) => {
    const priorityDiff = order[left.priority] - order[right.priority];
    if (priorityDiff !== 0) {
      return priorityDiff;
    }

    return parseISO(right.updatedAt).getTime() - parseISO(left.updatedAt).getTime();
  });
}

function getApprovalTone(status: ApprovalStatus | undefined) {
  switch (status) {
    case "approved":
      return "border-emerald-500/20 bg-emerald-500/8 text-emerald-700 dark:text-emerald-300";
    case "rejected":
      return "border-red-500/20 bg-red-500/8 text-red-700 dark:text-red-300";
    case "needs-revision":
      return "border-amber-500/20 bg-amber-500/8 text-amber-700 dark:text-amber-300";
    default:
      return "border-border/40 bg-muted/40 text-muted-foreground";
  }
}

function Surface({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-3xl border border-border/40 bg-card/80 p-4 shadow-sm backdrop-blur sm:p-5",
        className,
      )}
    >
      {children}
    </section>
  );
}

type MetricsFormState = {
  impressions: string;
  comments: string;
  reposts: string;
  reactions: string;
  followerDelta: string;
};

type CopyPostButtonProps = {
  content: string;
  label?: string;
  compact?: boolean;
  className?: string;
};

function CopyPostButton({
  content,
  label = "Copy Text",
  compact = false,
  className,
}: CopyPostButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) {
      return;
    }

    const timeoutId = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timeoutId);
  }, [copied]);

  async function handleCopy(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation();
    await navigator.clipboard.writeText(content);
    setCopied(true);
  }

  return (
    <Button
      variant="outline"
      className={cn("h-11 min-w-11 border-border/40", compact ? "w-11 rounded-xl p-0" : "px-4", className)}
      onClick={handleCopy}
      aria-label={copied ? "Copied!" : label}
      title={copied ? "Copied!" : label}
    >
      {copied ? <Check /> : <Copy />}
      {compact ? <span className="sr-only">{copied ? "Copied!" : label}</span> : copied ? "Copied!" : label}
    </Button>
  );
}

function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform];
  return (
    <Badge className={cn("ring-1 ring-inset", meta.pill)} variant="outline">
      <Circle className="size-2 fill-current" />
      {meta.label}
    </Badge>
  );
}

function PostTypeBadge({ postType }: { postType: PostType }) {
  const meta = POST_TYPE_META[postType];
  return (
    <Badge className={cn("ring-1 ring-inset", meta.badge)} variant="outline">
      {meta.label}
    </Badge>
  );
}

function StatusBadge({
  value,
}: {
  value:
    | keyof typeof POST_STATUS_META
    | keyof typeof IDEA_STATUS_META
    | keyof typeof APPROVAL_STATUS_META;
}) {
  const label =
    POST_STATUS_META[value as keyof typeof POST_STATUS_META] ??
    IDEA_STATUS_META[value as keyof typeof IDEA_STATUS_META] ??
    APPROVAL_STATUS_META[value as keyof typeof APPROVAL_STATUS_META];

  return (
    <Badge className="ring-1 ring-inset ring-border/40" variant="outline">
      {label}
    </Badge>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sparkles;
  title: string;
  description: string;
}) {
  return (
    <Surface className="border-dashed">
      <div className="flex flex-col items-center gap-3 py-8 text-center">
        <div className="rounded-full bg-muted p-3">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="text-base font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Surface>
  );
}

function ScheduleIdeaDialog({
  idea,
  open,
  onOpenChange,
}: {
  idea: Idea | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { scheduleIdea } = useContentHub();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedTime, setSelectedTime] = useState("09:00");
  const [selectedPlatform, setSelectedPlatform] = useState<PostPlatform>("linkedin");

  const availablePlatforms: PostPlatform[] =
    idea?.platform === "both"
      ? ["linkedin", "substack"]
      : idea?.platform
        ? [idea.platform]
        : ["linkedin"];

  const canSubmit = Boolean(idea && selectedDate);

  useEffect(() => {
    if (!idea) {
      return;
    }

    setSelectedDate(new Date());
    setSelectedTime("09:00");
    setSelectedPlatform(idea.platform === "substack" ? "substack" : "linkedin");
  }, [idea]);

  function handleSchedule() {
    if (!idea || !selectedDate) {
      return;
    }

    const [hours, minutes] = selectedTime.split(":").map(Number);
    const scheduledAt = new Date(selectedDate);
    scheduledAt.setHours(hours, minutes, 0, 0);

    scheduleIdea({
      ideaId: idea.id,
      title: idea.title,
      content: idea.description ?? "",
      scheduledAt: scheduledAt.toISOString(),
      platform: selectedPlatform,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Schedule Idea</DialogTitle>
        </DialogHeader>
        {idea ? (
          <div className="space-y-5">
            <p className="text-base font-semibold leading-snug">{idea.title}</p>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Date
                </label>
                <Input
                  className="h-12 text-base"
                  type="date"
                  value={selectedDate ? format(selectedDate, "yyyy-MM-dd") : ""}
                  onChange={(event) => {
                    const d = event.target.value ? parseISO(event.target.value) : undefined;
                    setSelectedDate(d);
                  }}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Time
                </label>
                <Input
                  className="h-12 text-base"
                  type="time"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                />
              </div>
            </div>

            {availablePlatforms.length > 1 ? (
              <div className="space-y-2">
                <label className="text-sm font-medium text-muted-foreground">
                  Platform
                </label>
                <div className="inline-flex rounded-xl border border-border/40 bg-muted/30 p-0.5">
                  {availablePlatforms.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      className={cn(
                        "min-h-12 rounded-[10px] px-5 py-2 text-base font-medium transition",
                        selectedPlatform === platform
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setSelectedPlatform(platform)}
                    >
                      {PLATFORM_META[platform].label}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button className="h-12 text-base" disabled={!canSubmit} onClick={handleSchedule}>
            <Send />
            Schedule for {selectedDate ? format(selectedDate, "MMM d") : "..."} · {PLATFORM_META[selectedPlatform].label}
          </Button>
          <Button variant="outline" className="h-12 text-base" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DraftActionDialog({
  post,
  mode,
  open,
  onOpenChange,
}: {
  post: Post | null;
  mode: "edit" | "comment" | ApprovalStatus | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addComment, savePostContent, setApprovalStatus } = useContentHub();
  const [content, setContent] = useState(post?.content ?? "");
  const [comment, setComment] = useState("");
  const [commentAuthor, setCommentAuthor] = useState<"edo" | "zima">("edo");

  useEffect(() => {
    setContent(post?.content ?? "");
    setComment("");
  }, [post, mode]);

  const config = APPROVAL_ACTIONS.find((action) => action.value === mode);
  const title =
    mode === "edit"
      ? "Edit draft"
      : mode === "comment"
        ? "Add feedback"
        : config?.label ?? "Update draft";
  const description =
    mode === "edit"
      ? "Save a new revision. The previous version is stored automatically."
      : mode === "comment"
        ? "Capture feedback for the draft thread."
        : config?.requireComment
          ? "A reason is required for this decision."
          : "Confirm the approval status update.";

  function close() {
    setComment("");
    onOpenChange(false);
  }

  function handleSubmit() {
    if (!post || !mode) {
      return;
    }

    if (mode === "edit") {
      savePostContent(post.id, content);
      close();
      return;
    }

    if (mode === "comment") {
      addComment(post.id, comment, commentAuthor);
      close();
      return;
    }

    if (config?.requireComment && !comment.trim()) {
      return;
    }

    setApprovalStatus(post.id, mode, comment);
    close();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">{title}</DialogTitle>
        </DialogHeader>
        {mode === "edit" ? (
          <Textarea
            className="min-h-72 text-base leading-7"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        ) : (
          <div className="space-y-3">
            {mode === "comment" ? (
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">As</span>
                <div className="inline-flex rounded-xl border border-border/40 bg-muted/30 p-0.5">
                  {(["edo", "zima"] as const).map((author) => (
                    <button
                      key={author}
                      type="button"
                      className={cn(
                        "min-h-11 rounded-[10px] px-4 py-1 text-sm font-medium transition",
                        commentAuthor === author
                          ? "bg-foreground text-background shadow-sm"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                      onClick={() => setCommentAuthor(author)}
                    >
                      {author === "edo" ? "Edo" : "Zima"}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
            <Textarea
              className="min-h-36 text-base"
              placeholder={
                config?.requireComment
                  ? "Explain the rejection or revision request"
                  : "Leave a note"
              }
              value={comment}
              onChange={(event) => setComment(event.target.value)}
            />
          </div>
        )}
        <DialogFooter>
          <Button
            className="h-12 text-base"
            disabled={
              mode === "comment"
                ? !comment.trim()
                : Boolean(config?.requireComment && !comment.trim())
            }
            onClick={handleSubmit}
          >
            {mode === "edit" ? <PencilLine /> : <Check />}
            Save
          </Button>
          <Button variant="outline" className="h-12 text-base" onClick={close}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PreviewText({
  children,
  className,
}: {
  children: string;
  className?: string;
}) {
  return (
    <div
      className={cn("text-base leading-7 text-muted-foreground whitespace-pre-wrap", className)}
      style={{
        display: "-webkit-box",
        WebkitBoxOrient: "vertical",
        WebkitLineClamp: 3,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

function PostMetricsGrid({ post }: { post: Post }) {
  return (
    <div className="grid grid-cols-2 gap-3 text-sm">
      <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
        <div className="text-muted-foreground">Impressions</div>
        <div className="text-xl font-semibold">
          {safeNumber(post.metrics?.impressions).toLocaleString()}
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
        <div className="text-muted-foreground">Comments</div>
        <div className="text-xl font-semibold">
          {safeNumber(post.metrics?.comments).toLocaleString()}
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
        <div className="text-muted-foreground">Reposts</div>
        <div className="text-xl font-semibold">
          {safeNumber(post.metrics?.reposts).toLocaleString()}
        </div>
      </div>
      <div className="rounded-2xl border border-border/40 bg-background/60 p-3">
        <div className="text-muted-foreground">Reactions</div>
        <div className="text-xl font-semibold">
          {safeNumber(post.metrics?.reactions).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

function FeedbackThread({ post }: { post: Post }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-base font-medium">Feedback thread</p>
        <span className="text-xs text-muted-foreground">{post.comments.length} comments</span>
      </div>

      {post.comments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet.</p>
      ) : (
        <div className="space-y-4">
          {post.comments.map((comment) => (
            <div key={comment.id} className="space-y-1 border-b border-border/40 pb-4 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">
                  {comment.author === "edo" ? "Edo" : "Zima"}
                </span>
                <span>{format(parseISO(comment.createdAt), "MMM d, p")}</span>
              </div>
              <p className="text-base leading-7">{comment.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BoardPostActions({
  post,
  onOpenAction,
  onOpenMetrics,
}: {
  post: Post;
  onOpenAction: (postId: string, mode: "edit" | "comment" | ApprovalStatus) => void;
  onOpenMetrics: (postId: string) => void;
}) {
  if (post.status === "posted") {
    return (
      <>
        <PostMetricsGrid post={post} />
        <Button
          variant="outline"
          className="h-11 w-full justify-center border-border/40"
          onClick={() => onOpenMetrics(post.id)}
        >
          <PencilLine />
          Enter Metrics
        </Button>
      </>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {post.approvalStatus !== "approved" ? (
        <Button className="h-11 w-full justify-center" onClick={() => onOpenAction(post.id, "approved")}>
          <Check />
          Approve
        </Button>
      ) : null}
      <Button
        variant="outline"
        className="h-11 w-full justify-center border-border/40"
        onClick={() => onOpenAction(post.id, "edit")}
      >
        <PencilLine />
        Edit
      </Button>
      <Button
        variant="outline"
        className="h-11 w-full justify-center border-border/40"
        onClick={() => onOpenAction(post.id, "comment")}
      >
        <MessageSquareText />
        Comment
      </Button>
      {post.approvalStatus !== "rejected" ? (
        <Button
          variant="destructive"
          className="h-11 w-full justify-center"
          onClick={() => onOpenAction(post.id, "rejected")}
        >
          <X />
          Reject
        </Button>
      ) : null}
    </div>
  );
}

function BoardCardDialog({
  idea,
  post,
  open,
  onOpenChange,
  onScheduleIdea,
  onMoveIdeaStatus,
  onOpenPostAction,
  onOpenMetrics,
}: {
  idea: Idea | null;
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleIdea: (idea: Idea) => void;
  onMoveIdeaStatus: (ideaId: string, status: Idea["status"]) => void;
  onOpenPostAction: (postId: string, mode: "edit" | "comment" | ApprovalStatus) => void;
  onOpenMetrics: (postId: string) => void;
}) {
  const activeIdea = idea;
  const activePost = post;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-x-hidden sm:max-w-2xl">
        {activeIdea ? (
          <>
            <DialogHeader className="pr-10 overflow-hidden">
              <DialogTitle className="text-xl leading-tight">{activeIdea.title}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("ring-1 ring-inset", PRIORITY_META[activeIdea.priority].badge)} variant="outline">
                  {PRIORITY_META[activeIdea.priority].label}
                </Badge>
                <PlatformBadge platform={activeIdea.platform} />
                <PostTypeBadge postType={activeIdea.postType} />
                <StatusBadge value={activeIdea.status} />
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <pre className="font-sans whitespace-pre-wrap break-words overflow-hidden text-base leading-7 text-foreground">
                {activeIdea.description || "No description yet."}
              </pre>

              {(activeIdea.tags ?? []).length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {(activeIdea.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="outline" className="ring-1 ring-inset ring-border/40">
                      <Link2 />
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}

              <Button className="h-12 w-full text-base" onClick={() => onScheduleIdea(activeIdea)}>
                <Plus />
                Add to Calendar
              </Button>

              <div className="flex flex-col gap-2">
                {activeIdea.status === "new" ? (
                  <Button
                    variant="outline"
                    className="h-12 w-full text-base"
                    onClick={() => onMoveIdeaStatus(activeIdea.id, "developing")}
                  >
                    Move to Developing →
                  </Button>
                ) : null}

                {activeIdea.status === "developing" ? (
                  <Button
                    variant="outline"
                    className="h-12 w-full text-base"
                    onClick={() => onMoveIdeaStatus(activeIdea.id, "new")}
                  >
                    ← Move to New
                  </Button>
                ) : null}
              </div>
            </div>
          </>
        ) : null}

        {activePost ? (
          <>
            <DialogHeader className="pr-10 overflow-hidden">
              <DialogTitle className="text-xl leading-tight">{activePost.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={activePost.platform} />
                <PostTypeBadge postType={activePost.postType} />
                <StatusBadge value={activePost.status} />
                {activePost.approvalStatus ? <StatusBadge value={activePost.approvalStatus} /> : null}
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(activePost.scheduledAt), "MMM d")}
                </span>
              </div>
            </DialogHeader>

            <div className="space-y-5">
              {activePost.approvalStatus ? (
                <div className={cn("rounded-2xl border px-4 py-3 text-base font-medium", getApprovalTone(activePost.approvalStatus))}>
                  {APPROVAL_STATUS_META[activePost.approvalStatus]}
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <CopyPostButton content={activePost.content} label="Copy Text" className="w-full sm:w-auto" />
                {activePost.imageUrl ? (
                  <Button
                    variant="outline"
                    className="h-11 w-full border-border/40 sm:w-auto"
                    render={<a href={activePost.imageUrl} download={getImageDownloadName(activePost)} />}
                  >
                    <Download />
                    Download Image
                  </Button>
                ) : null}
              </div>

              <pre className="font-sans whitespace-pre-wrap break-words overflow-hidden text-base leading-7 text-foreground">
                {activePost.content}
              </pre>

              {activePost.imageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
                  <TappableImage
                    src={activePost.imageUrl}
                    alt={`Image for ${activePost.title}`}
                    className="h-auto max-h-[28rem] w-full object-cover"
                  />
                </div>
              ) : null}

              <BoardPostActions post={activePost} onOpenAction={onOpenPostAction} onOpenMetrics={onOpenMetrics} />

              <FeedbackThread post={activePost} />
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function CalendarAgenda({ date, posts }: { date: Date; posts: Post[] }) {
  return (
    <Surface className="h-full">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-bold tracking-tight">{formatDayLabel(date)}</h3>
        </div>
        <Badge
          variant="outline"
          className="h-7 rounded-full border-border/50 bg-foreground/[0.045] px-3 text-sm font-semibold ring-1 ring-inset ring-border/40"
        >
          {posts.length} scheduled
        </Badge>
      </div>

      <div className="mt-4 space-y-3">
        {posts.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No scheduled content"
            description="Choose another day or add an idea from the Ideas tab."
          />
        ) : (
          posts.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-border/40 bg-background/60 p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    <PlatformBadge platform={post.platform} />
                    <PostTypeBadge postType={post.postType} />
                    <StatusBadge value={post.status} />
                  </div>
                  <p className="text-lg font-semibold leading-7">{post.title}</p>
                </div>
                <CopyPostButton content={post.content} label={`Copy ${post.title} text`} compact />
              </div>

              <div className="mt-3 flex items-center gap-2 text-base text-muted-foreground">
                <Clock3 className="size-4" />
                {format(parseISO(post.scheduledAt), "p")}
              </div>

              <pre className="mt-3 font-sans whitespace-pre-wrap text-base leading-7 text-muted-foreground">
                {post.content}
              </pre>

              {post.imageUrl ? (
                <div className="mt-4 space-y-3">
                  <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
                    <TappableImage
                      src={post.imageUrl}
                      alt={`Image for ${post.title}`}
                      className="h-auto w-full object-cover"
                    />
                  </div>
                  <Button
                    variant="outline"
                    className="h-12 w-full text-base border-border/40"
                    render={<a href={post.imageUrl} download={getImageDownloadName(post)} />}
                  >
                    <Download />
                    Download Image
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </Surface>
  );
}

function CalendarView() {
  const { data } = useContentHub();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState<"month" | "week">("week");
  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const monthEnd = addDays(startOfWeek(endOfMonth(month), { weekStartsOn: 0 }), 6);
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekEnd = addDays(weekStart, 6);
  const days = eachDayOfInterval({
    start: calendarMode === "month" ? monthStart : weekStart,
    end: calendarMode === "month" ? monthEnd : weekEnd,
  });
  const calendarPosts = data.posts.filter(
    (post) => post.approvalStatus === "approved" || post.status === "posted",
  );
  const agenda = sortPostsByDate(calendarPosts.filter((post) => postMatchesDate(post, selectedDate)));
  const calendarLabel =
    calendarMode === "month"
      ? format(month, "MMMM yyyy")
      : format(weekStart, "MMM d") +
        " - " +
        (isSameMonth(weekStart, weekEnd) ? format(weekEnd, "d, yyyy") : format(weekEnd, "MMM d, yyyy"));

  function handleMonthChange(nextMonth: Date) {
    setMonth(nextMonth);
    setSelectedDate(startOfMonth(nextMonth));
  }

  function handlePrevious() {
    if (calendarMode === "month") {
      handleMonthChange(subMonths(month, 1));
      return;
    }

    const nextDate = addDays(selectedDate, -7);
    setSelectedDate(nextDate);
    setMonth(startOfMonth(nextDate));
  }

  function handleNext() {
    if (calendarMode === "month") {
      handleMonthChange(addMonths(month, 1));
      return;
    }

    const nextDate = addDays(selectedDate, 7);
    setSelectedDate(nextDate);
    setMonth(startOfMonth(nextDate));
  }

  return (
    <div className="grid gap-4">
      <Surface>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-2xl font-bold tracking-tight lg:text-xl">{calendarLabel}</h3>
          </div>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <div className="inline-flex rounded-xl border border-border/40 bg-muted/30 p-0.5">
              {(["month", "week"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  className={cn(
                    "rounded-[10px] px-3 py-2 text-sm font-medium transition sm:px-4",
                    calendarMode === mode
                      ? "bg-foreground text-background shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                  onClick={() => setCalendarMode(mode)}
                >
                  {mode === "month" ? "Month" : "Week"}
                </button>
              ))}
            </div>
            <Button
              variant="outline"
              size="icon-lg"
              className="border-border/40"
              onClick={handlePrevious}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              className="border-border/40 px-3 text-sm font-medium"
              onClick={() => {
                const today = new Date();
                setSelectedDate(today);
                setMonth(startOfMonth(today));
              }}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className="border-border/40"
              onClick={handleNext}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground sm:gap-2 sm:text-sm">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day} className="px-1 pb-2 text-center">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {days.map((date) => {
            const posts = sortPostsByDate(calendarPosts.filter((post) => postMatchesDate(post, date)));
            const isActive = isSameDay(date, selectedDate);

            return (
              <button
                key={date.toISOString()}
                type="button"
                className={cn(
                  calendarMode === "month"
                    ? "aspect-square rounded-2xl border px-1 py-1.5 text-center transition sm:min-h-24 sm:aspect-auto sm:p-2 sm:text-left"
                    : "min-h-32 rounded-2xl border px-2 py-2 text-left transition sm:p-3",
                  isActive
                    ? "border-primary/25 bg-primary/[0.05]"
                    : "border-border/40 bg-background/70 hover:bg-muted/40",
                  calendarMode === "month" && !isSameMonth(date, month) && "opacity-45",
                )}
                onClick={() => {
                  setSelectedDate(date);
                  setMonth(startOfMonth(date));
                }}
              >
                <div
                  className={cn(
                    "flex h-full flex-col gap-1",
                    calendarMode === "month"
                      ? "items-center justify-center sm:block"
                      : "justify-start",
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center gap-2",
                      calendarMode === "month" ? "justify-center sm:justify-between" : "justify-between",
                    )}
                  >
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full text-base font-medium transition",
                        isActive
                          ? "size-9 bg-primary text-primary-foreground"
                          : isToday(date)
                            ? "size-9 bg-foreground text-background"
                            : "size-8 text-foreground",
                      )}
                    >
                      {format(date, "d")}
                    </span>
                    <div className="hidden items-center gap-1 sm:flex">
                      {posts.slice(0, 3).map((post) => (
                        <span
                          key={post.id}
                          className="size-1.5 rounded-full"
                          style={{ backgroundColor: getPlatformColor(post.platform) }}
                        />
                      ))}
                    </div>
                  </div>

                  <div className={cn("flex items-center gap-1 sm:hidden", calendarMode === "month" ? "justify-center" : "justify-start")}>
                    {posts.slice(0, 3).map((post) => (
                      <span
                        key={post.id}
                        className="size-2 rounded-full"
                        style={{ backgroundColor: getPlatformColor(post.platform) }}
                      />
                    ))}
                  </div>

                  <div
                    className={cn(
                      "mt-3 space-y-1 text-xs",
                      calendarMode === "month" ? "hidden sm:block" : "block",
                    )}
                  >
                    {posts.slice(0, 2).map((post) => (
                      <div
                        key={post.id}
                        className="truncate rounded-xl px-2 py-1"
                        style={{ backgroundColor: `${getPlatformColor(post.platform)}18` }}
                      >
                        {post.title}
                      </div>
                    ))}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </Surface>

      <CalendarAgenda date={selectedDate} posts={agenda} />
    </div>
  );
}

function BoardView() {
  const { data, setApprovalStatus, saveMetrics, updateIdea } = useContentHub();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardType, setSelectedCardType] = useState<"idea" | "post" | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [selectedActionPostId, setSelectedActionPostId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"edit" | "comment" | ApprovalStatus | null>(null);
  const [selectedMetricsPostId, setSelectedMetricsPostId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<MetricsFormState>({
    impressions: "",
    comments: "",
    reposts: "",
    reactions: "",
    followerDelta: "",
  });
  const ideas = sortIdeasByPriority(
    data.ideas.filter((idea) => idea.status === "new" || idea.status === "developing"),
  );
  const selectedActionPost = data.posts.find((post) => post.id === selectedActionPostId) ?? null;
  const selectedMetricsPost = data.posts.find((post) => post.id === selectedMetricsPostId) ?? null;
  const selectedDialogIdea =
    selectedCardType === "idea" ? data.ideas.find((idea) => idea.id === selectedCardId) ?? null : null;
  const selectedDialogPost =
    selectedCardType === "post" ? data.posts.find((post) => post.id === selectedCardId) ?? null : null;

  const columns: Array<{
    id: string;
    title: string;
    tone: string;
    cardBorder: string;
    empty: string;
    ideas?: Idea[];
    posts?: Post[];
  }> = [
    {
      id: "ideas",
      title: "Ideas",
      tone: "bg-background",
      cardBorder: "bg-gray-50 dark:bg-gray-900/30",
      empty: "No ideas in motion",
      ideas,
    },
    {
      id: "draft",
      title: "Draft",
      tone: "bg-amber-500/10",
      cardBorder: "bg-amber-50/60 dark:bg-amber-950/20",
      empty: "No pending drafts",
      posts: sortPostsByDate(
        data.posts.filter((post) => post.status === "draft" && post.approvalStatus === "pending"),
      ),
    },
    {
      id: "review",
      title: "Review",
      tone: "bg-orange-500/10",
      cardBorder: "bg-orange-50/60 dark:bg-orange-950/20",
      empty: "Nothing needs review",
      posts: sortPostsByDate(
        data.posts.filter((post) => post.status === "review" || post.approvalStatus === "needs-revision"),
      ),
    },
    {
      id: "approved",
      title: "Approved",
      tone: "bg-emerald-500/10",
      cardBorder: "bg-emerald-50/60 dark:bg-emerald-950/20",
      empty: "No approved content waiting",
      posts: sortPostsByDate(
        data.posts.filter((post) => post.approvalStatus === "approved" && post.status !== "posted"),
      ),
    },
    {
      id: "posted",
      title: "Posted",
      tone: "bg-blue-500/10",
      cardBorder: "bg-blue-50/60 dark:bg-blue-950/20",
      empty: "No posted content yet",
      posts: sortPostsByDate(data.posts.filter((post) => post.status === "posted")),
    },
  ];

  function openDialog(postId: string, mode: "edit" | "comment" | ApprovalStatus) {
    const config = APPROVAL_ACTIONS.find((action) => action.value === mode);
    if (config && !config.requireComment) {
      setApprovalStatus(postId, mode as Post["approvalStatus"]);
      return;
    }

    setSelectedActionPostId(postId);
    setDialogMode(mode);
  }

  function openCardDialog(cardId: string, cardType: "idea" | "post") {
    setSelectedCardId(cardId);
    setSelectedCardType(cardType);
  }

  function openMetrics(postId: string) {
    const post = data.posts.find((entry) => entry.id === postId);
    setSelectedMetricsPostId(postId);
    setMetrics({
      impressions: String(post?.metrics?.impressions ?? ""),
      comments: String(post?.metrics?.comments ?? ""),
      reposts: String(post?.metrics?.reposts ?? ""),
      reactions: String(post?.metrics?.reactions ?? ""),
      followerDelta: String(post?.metrics?.followerDelta ?? ""),
    });
  }

  function submitMetrics() {
    if (!selectedMetricsPost) {
      return;
    }

    saveMetrics(selectedMetricsPost.id, {
      impressions: Number(metrics.impressions || 0),
      comments: Number(metrics.comments || 0),
      reposts: Number(metrics.reposts || 0),
      reactions: Number(metrics.reactions || 0),
      followerDelta: Number(metrics.followerDelta || 0),
    });
    setSelectedMetricsPostId(null);
  }

  return (
    <div className="space-y-3">
      {columns.every((column) => (column.ideas?.length ?? column.posts?.length ?? 0) === 0) ? (
        <EmptyState
          icon={LayoutGrid}
          title="Board is empty"
          description="Add ideas or schedule content to start the pipeline."
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:snap-none lg:grid-cols-5 lg:items-start lg:gap-6 lg:overflow-visible lg:px-0 xl:gap-6">
          {columns.map((column) => (
            <section
              key={column.id}
              className="flex w-[85vw] shrink-0 snap-center flex-col lg:min-w-[300px] lg:w-auto xl:min-w-[350px]"
            >
              <div
                className={cn(
                  "sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border/40 px-4 py-3",
                  column.tone,
                )}
              >
                <h3 className="truncate text-base font-bold tracking-tight">{column.title}</h3>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
                  {(column.ideas?.length ?? column.posts?.length) || 0}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {column.ideas?.map((idea) => {

                  return (
                    <Surface key={idea.id} className={cn("w-full overflow-hidden p-0", column.cardBorder)}>
                      <button
                        type="button"
                        className="flex min-h-11 w-full items-start justify-between gap-3 p-4 text-left lg:p-5"
                        onClick={() => openCardDialog(idea.id, "idea")}
                      >
                        <div className="min-w-0">
                          <p className="text-lg font-semibold leading-7">{idea.title}</p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <Badge className={cn("ring-1 ring-inset", PRIORITY_META[idea.priority].badge)} variant="outline">
                              {PRIORITY_META[idea.priority].label}
                            </Badge>
                            <PlatformBadge platform={idea.platform} />
                            <StatusBadge value={idea.status} />
                          </div>
                        </div>
                      </button>
                    </Surface>
                  );
                })}

                {column.posts?.map((post) => {

                  return (
                    <Surface key={post.id} className={cn("w-full overflow-hidden p-0", column.cardBorder)}>
                      <div className="p-4 sm:p-5 lg:p-6">
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                            onClick={() => openCardDialog(post.id, "post")}
                          >
                            <div className="min-w-0">
                              <p className="text-lg font-semibold leading-7">{post.title}</p>
                              <div className="mt-3 flex flex-wrap items-center gap-2">
                                <PlatformBadge platform={post.platform} />
                                {post.approvalStatus ? <StatusBadge value={post.approvalStatus} /> : null}
                                <span className="text-base text-muted-foreground">
                                  {format(parseISO(post.scheduledAt), "MMM d")}
                                </span>
                              </div>
                            </div>
                          </button>

                          <CopyPostButton
                            content={post.content}
                            label={`Copy ${post.title} text`}
                            compact
                            className="shrink-0"
                          />
                        </div>

                        {post.imageUrl ? (
                          <div className="mt-4 overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
                            <TappableImage
                              src={post.imageUrl}
                              alt={`Image for ${post.title}`}
                              className="h-32 w-full object-cover lg:h-40"
                            />
                          </div>
                        ) : null}
                      </div>
                    </Surface>
                  );
                })}

                {(column.ideas?.length ?? column.posts?.length ?? 0) === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-base text-muted-foreground">
                    {column.empty}
                  </div>
                ) : null}
              </div>
            </section>
          ))}
        </div>
      )}

      <BoardCardDialog
        idea={selectedDialogIdea}
        post={selectedDialogPost}
        open={Boolean(selectedCardId && selectedCardType)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedCardId(null);
            setSelectedCardType(null);
          }
        }}
        onScheduleIdea={(idea) => {
          setSelectedCardId(null);
          setSelectedCardType(null);
          setSelectedIdea(idea);
        }}
        onMoveIdeaStatus={(ideaId, status) => updateIdea(ideaId, { status })}
        onOpenPostAction={(postId, mode) => {
          setSelectedCardId(null);
          setSelectedCardType(null);
          openDialog(postId, mode);
        }}
        onOpenMetrics={(postId) => {
          setSelectedCardId(null);
          setSelectedCardType(null);
          openMetrics(postId);
        }}
      />

      <DraftActionDialog
        post={selectedActionPost}
        mode={dialogMode}
        open={Boolean(selectedActionPost && dialogMode)}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
            setSelectedActionPostId(null);
          }
        }}
      />

      <ScheduleIdeaDialog
        idea={selectedIdea}
        open={Boolean(selectedIdea)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIdea(null);
          }
        }}
      />

      <Dialog open={Boolean(selectedMetricsPost)} onOpenChange={(open) => !open && setSelectedMetricsPostId(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg">Update Metrics</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {(
              [
                ["impressions", "Impressions"],
                ["comments", "Comments"],
                ["reposts", "Reposts"],
                ["reactions", "Reactions"],
                ["followerDelta", "Follower Δ"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input
                  className="h-12 text-base"
                  inputMode="numeric"
                  value={metrics[key]}
                  onChange={(event) =>
                    setMetrics((current) => ({ ...current, [key]: event.target.value }))
                  }
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button className="h-12 text-base" onClick={submitMetrics}>
              <Check />
              Save metrics
            </Button>
            <Button variant="outline" className="h-12 text-base" onClick={() => setSelectedMetricsPostId(null)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SettingsView() {
  const {
    data,
    importData,
    exportData,
    setNotificationsEnabled,
    setPostingSchedule,
    setTheme,
  } = useContentHub();
  const [importError, setImportError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    const json = exportData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `content-hub-export-${format(new Date(), "yyyy-MM-dd")}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result));
        startTransition(() => {
          importData(parsed);
          setImportError(null);
        });
      } catch {
        setImportError("Import failed. Use a valid Content Hub export JSON file.");
      }
    };
    reader.readAsText(file);
  }

  function toggleScheduleDay(platform: PostPlatform, day: number) {
    const current = data.settings.postingSchedule[platform];
    const next = current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day].sort((left, right) => left - right);
    setPostingSchedule(platform, next);
  }

  return (
    <div className="space-y-5">
        <Card className="border border-border/40 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>Switch between system, light, and dark modes.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {(
              [
                ["system", "System", PanelLeft],
                ["light", "Light", Sun],
                ["dark", "Dark", Moon],
              ] as const
            ).map(([value, label, Icon]) => (
              <Button
                key={value}
                variant={data.settings.theme === value ? "default" : "outline"}
                className="h-11 px-4"
                onClick={() => setTheme(value as ThemePreference)}
              >
                <Icon />
                {label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card className="border border-border/40 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Posting Schedule</CardTitle>
            <CardDescription>Configure the target publishing days for each platform.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {(["linkedin", "substack"] as const).map((platform) => (
              <div key={platform} className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{PLATFORM_META[platform].label}</p>
                  <PlatformBadge platform={platform} />
                </div>
                <div className="flex flex-wrap gap-2">
                  {WEEKDAY_OPTIONS.map((option) => {
                    const active = data.settings.postingSchedule[platform].includes(option.value);
                    return (
                      <Button
                        key={option.value}
                        variant={active ? "default" : "outline"}
                        className="h-11 min-w-14"
                        onClick={() => toggleScheduleDay(platform, option.value)}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
    </div>
  );
}

export function ContentHubDashboard() {
  const { data, isReady } = useContentHub();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<TabId>(() => parseTab(searchParams.get("tab")));

  function setActiveTab(nextTab: TabId) {
    setActiveTabState(nextTab);
    setMobileNavOpen(false);

    // Update URL in background (non-blocking)
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "board") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    window.history.replaceState(null, "", params.size ? `${pathname}?${params.toString()}` : pathname);
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-full border border-border/40 bg-card/80 px-5 py-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading content hub
        </div>
      </div>
    );
  }

  return (
    <ImageViewerProvider>
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,119,181,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,103,25,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.92))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(0,119,181,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,103,25,0.16),transparent_20%),linear-gradient(180deg,rgba(9,9,11,1),rgba(12,12,14,1))]">
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur">
        <div className="mx-auto flex min-h-18 w-full max-w-[100rem] items-center justify-between gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center gap-3">
            <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="outline"
                    size="icon-lg"
                    className="border-border/40"
                    aria-label="Open navigation"
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-border/40">
                <SheetHeader>
                  <SheetTitle>Content Hub</SheetTitle>
                </SheetHeader>
                <div className="space-y-2 p-4 pt-0">
                  {TAB_ITEMS.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        className={cn(
                          "flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                          item.id === activeTab
                            ? "bg-foreground text-background"
                            : "border border-border/40 bg-background text-foreground",
                        )}
                        onClick={() => setActiveTab(item.id)}
                        type="button"
                      >
                        <Icon className="size-5" />
                        <div>
                          <div className="font-medium">{item.label}</div>
                          <div className={cn("text-xs", item.id === activeTab ? "text-background/70" : "text-muted-foreground")}>
                            {item.description}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </SheetContent>
            </Sheet>

            <div>
              <div className="text-sm uppercase tracking-[0.22em] text-muted-foreground">
                {format(new Date(), "EEEE, MMMM d")}
              </div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                {TAB_ITEMS.find((item) => item.id === activeTab)?.label}
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main
        className={cn(
          "mx-auto flex-1 py-4 pb-24 sm:py-5",
          activeTab === "board" ? "max-w-[100rem] px-4 lg:px-8" : "max-w-3xl px-4",
        )}
      >
        {activeTab === "board" ? <BoardView /> : null}
        {activeTab === "calendar" ? <CalendarView /> : null}
        {activeTab === "settings" ? <SettingsView /> : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/92 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-3">
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                className={cn(
                  "flex min-h-14 flex-col items-center justify-center rounded-2xl px-1 py-2 text-xs font-medium transition-colors active:opacity-70",
                  active ? "bg-foreground text-background" : "text-muted-foreground",
                )}
                onClick={() => setActiveTab(item.id)}
                onTouchEnd={(event) => {
                  event.preventDefault();
                  setActiveTab(item.id);
                }}
                type="button"
              >
                <Icon className="mb-0.5 size-6" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
    </ImageViewerProvider>
  );
}
