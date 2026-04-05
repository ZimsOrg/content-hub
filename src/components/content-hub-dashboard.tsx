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
  ArrowDownToLine,
  ArrowUpFromLine,
  BarChart3,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  Copy,
  Download,
  FileText,
  Flame,
  ImageIcon,
  Lightbulb,
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
  TrendingUp,
  X,
} from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

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
  { id: "calendar", label: "Calendar", icon: CalendarDays, description: "Schedule and agenda" },
  { id: "ideas", label: "Ideas", icon: Lightbulb, description: "Idea bank and capture" },
  { id: "drafts", label: "Drafts", icon: FileText, description: "Review and approvals" },
  { id: "analytics", label: "Analytics", icon: BarChart3, description: "Performance tracking" },
  { id: "settings", label: "Settings", icon: Settings2, description: "Theme and data controls" },
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
  return TAB_ITEMS.some((tab) => tab.id === value) ? (value as TabId) : "calendar";
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

  function handleTouchEnd() {
    lastTouchRef.current = null;
    if (scale <= 1.05) resetTransform();
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
        onTouchEnd={(event) => { handleTouchEnd(); handleDoubleTap(event); }}
        style={{ touchAction: "none" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
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

function TappableImage({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const { openImage } = useImageViewer();
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

function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof TrendingUp;
}) {
  return (
    <Card className="border border-border/40 bg-card/80 shadow-none">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-sm text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
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
  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const monthEnd = addDays(startOfWeek(endOfMonth(month), { weekStartsOn: 0 }), 6);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const agenda = sortPostsByDate(data.posts.filter((post) => postMatchesDate(post, selectedDate)));

  function handleMonthChange(nextMonth: Date) {
    setMonth(nextMonth);
    setSelectedDate(startOfMonth(nextMonth));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
      <Surface>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-2xl font-bold tracking-tight lg:text-xl">{format(month, "MMMM yyyy")}</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon-lg"
              className="border-border/40"
              onClick={() => handleMonthChange(subMonths(month, 1))}
            >
              <ChevronLeft />
            </Button>
            <Button
              variant="outline"
              size="icon-lg"
              className="border-border/40"
              onClick={() => handleMonthChange(addMonths(month, 1))}
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
            const posts = sortPostsByDate(data.posts.filter((post) => postMatchesDate(post, date)));
            const isActive = isSameDay(date, selectedDate);

            return (
              <button
                key={date.toISOString()}
                type="button"
                className={cn(
                  "aspect-square rounded-2xl border px-1 py-1.5 text-center transition sm:min-h-24 sm:aspect-auto sm:p-2 sm:text-left",
                  isActive
                    ? "border-primary/25 bg-primary/[0.05]"
                    : "border-border/40 bg-background/70 hover:bg-muted/40",
                  !isSameMonth(date, month) && "opacity-45",
                )}
                onClick={() => setSelectedDate(date)}
              >
                <div className="flex h-full flex-col items-center justify-center gap-1 sm:block">
                  <div className="flex items-center justify-center gap-2 sm:justify-between">
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

                  <div className="flex items-center justify-center gap-1 sm:hidden">
                    {posts.slice(0, 3).map((post) => (
                      <span
                        key={post.id}
                        className="size-2 rounded-full"
                        style={{ backgroundColor: getPlatformColor(post.platform) }}
                      />
                    ))}
                  </div>

                  <div className="mt-3 hidden space-y-1 text-xs sm:block">
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

      <div className="lg:hidden">
        <CalendarAgenda date={selectedDate} posts={agenda} />
      </div>
      <div className="hidden lg:block">
        <CalendarAgenda date={selectedDate} posts={agenda} />
      </div>
    </div>
  );
}

function IdeasView() {
  const { data, updateIdea } = useContentHub();
  const [expandedIdeaId, setExpandedIdeaId] = useState<string | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const ideas = sortIdeasByPriority(data.ideas);
  const columns: Array<{
    title: string;
    status: Idea["status"];
    tone: string;
    ideas: Idea[];
  }> = [
    {
      title: "New",
      status: "new",
      tone: "bg-background",
      ideas: ideas.filter((idea) => idea.status === "new"),
    },
    {
      title: "In Progress",
      status: "developing",
      tone: "bg-amber-500/10",
      ideas: ideas.filter((idea) => idea.status === "developing"),
    },
    {
      title: "Scheduled",
      status: "ready",
      tone: "bg-emerald-500/10",
      ideas: ideas.filter((idea) => idea.status === "ready"),
    },
  ];

  return (
    <div className="space-y-3">
      {ideas.length === 0 ? (
        <EmptyState
          icon={Lightbulb}
          title="No ideas yet"
          description="Capture new ideas to build the next publishing run."
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:snap-none sm:grid-cols-3 sm:items-start sm:overflow-visible sm:px-0">
          {columns.map((column) => (
            <section
              key={column.status}
              className="flex w-[85vw] shrink-0 snap-center flex-col sm:w-auto"
            >
              <div className={cn("sticky top-0 z-10 flex items-center justify-between rounded-2xl border border-border/40 px-5 py-4", column.tone)}>
                <h3 className="text-lg font-bold tracking-tight">{column.title}</h3>
                <span className="flex size-7 items-center justify-center rounded-full bg-foreground/10 text-sm font-semibold">
                  {column.ideas.length}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {column.ideas.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/50 px-4 py-8 text-center text-base text-muted-foreground">
                    No ideas yet
                  </div>
                ) : (
                  column.ideas.map((idea) => {
                    const expanded = expandedIdeaId === idea.id;

                    return (
                      <Surface key={idea.id} className="overflow-hidden p-0">
                        <button
                          type="button"
                          className="flex min-h-11 w-full items-start justify-between gap-3 p-4 text-left"
                          onClick={() => setExpandedIdeaId(expanded ? null : idea.id)}
                        >
                          <div className="min-w-0">
                            <p className="text-lg font-semibold leading-7">{idea.title}</p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Badge
                                className={cn("ring-1 ring-inset", PRIORITY_META[idea.priority].badge)}
                                variant="outline"
                              >
                                {PRIORITY_META[idea.priority].label}
                              </Badge>
                              <PlatformBadge platform={idea.platform} />
                            </div>
                          </div>
                          <ChevronDown className={cn("mt-1 size-5 shrink-0 transition", expanded && "rotate-180")} />
                        </button>

                        {expanded ? (
                          <div className="border-t border-border/40 px-4 py-4">
                            <div className="space-y-4">
                              <p className="text-base leading-7 text-muted-foreground">
                                {idea.description || "No description yet."}
                              </p>

                              {(idea.tags ?? []).length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {(idea.tags ?? []).map((tag) => (
                                    <Badge key={tag} variant="outline" className="ring-1 ring-inset ring-border/40">
                                      <Link2 />
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              ) : null}

                              {idea.status !== "ready" ? (
                                <Button className="h-12 w-full text-base" onClick={() => setSelectedIdea(idea)}>
                                  <Plus />
                                  Add to Calendar
                                </Button>
                              ) : (
                                <div className="flex min-h-11 items-center text-base font-medium text-emerald-700 dark:text-emerald-400">
                                  Scheduled ✓
                                </div>
                              )}

                              <div className="flex flex-col gap-2">
                                {idea.status === "new" ? (
                                  <Button
                                    variant="outline"
                                    className="h-12 w-full text-base"
                                    onClick={() => updateIdea(idea.id, { status: "developing" })}
                                  >
                                    Move to In Progress →
                                  </Button>
                                ) : null}

                                {idea.status === "developing" ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      className="h-12 w-full text-base"
                                      onClick={() => updateIdea(idea.id, { status: "new" })}
                                    >
                                      ← Move to New
                                    </Button>
                                    <Button
                                      variant="outline"
                                      className="h-12 w-full text-base"
                                      onClick={() => updateIdea(idea.id, { status: "ready" })}
                                    >
                                      Move to Scheduled →
                                    </Button>
                                  </>
                                ) : null}

                                {idea.status === "ready" ? (
                                  <Button
                                    variant="outline"
                                    className="h-12 w-full text-base"
                                    onClick={() => updateIdea(idea.id, { status: "developing" })}
                                  >
                                    ← Move to In Progress
                                  </Button>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </Surface>
                    );
                  })
                )}
              </div>
            </section>
          ))}
        </div>
      )}

      <ScheduleIdeaDialog
        idea={selectedIdea}
        open={Boolean(selectedIdea)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedIdea(null);
          }
        }}
      />
    </div>
  );
}

function DraftsView() {
  const { data, setApprovalStatus } = useContentHub();
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"edit" | "comment" | ApprovalStatus | null>(null);

  const drafts = sortPostsByDate(
    data.posts.filter((post) => post.status !== "posted" || post.approvalStatus !== "approved"),
  );
  const activePost = drafts.find((post) => post.id === activePostId) ?? null;

  function openDialog(postId: string, mode: "edit" | "comment" | ApprovalStatus) {
    const config = APPROVAL_ACTIONS.find((action) => action.value === mode);
    if (config && !config.requireComment) {
      setApprovalStatus(postId, mode as Post["approvalStatus"]);
      return;
    }

    setActivePostId(postId);
    setDialogMode(mode);
  }

  return (
    <div className="space-y-3">
      {drafts.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Draft queue is clear"
          description="All scheduled content has been approved or posted."
        />
      ) : (
        drafts.map((post) => {
          const expanded = activePostId === post.id;

          return (
            <Surface key={post.id} className="p-0">
              <div className="flex items-start gap-3 p-4 sm:p-5">
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start justify-between gap-3 text-left"
                  onClick={() => setActivePostId(expanded ? null : post.id)}
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
                  <ChevronDown className={cn("mt-1 size-5 shrink-0 transition", expanded && "rotate-180")} />
                </button>

                <CopyPostButton
                  content={post.content}
                  label={`Copy ${post.title} text`}
                  compact
                  className="shrink-0"
                />
              </div>

              {expanded ? (
                <div className="border-t border-border/40 px-4 py-4 sm:px-5">
                  <div className="space-y-5">
                    {post.approvalStatus ? (
                      <div className={cn("rounded-2xl border px-4 py-3 text-base font-medium", getApprovalTone(post.approvalStatus))}>
                        {APPROVAL_STATUS_META[post.approvalStatus]}
                      </div>
                    ) : null}

                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <PostTypeBadge postType={post.postType} />
                        <StatusBadge value={post.status} />
                        {post.imageUrl ? (
                          <span className="inline-flex items-center gap-1 text-base text-muted-foreground">
                            <ImageIcon className="size-4" />
                            Image attached
                          </span>
                        ) : null}
                      </div>
                      <pre className="font-sans whitespace-pre-wrap text-base leading-7 text-foreground">
                        {post.content}
                      </pre>
                    </div>

                    {post.imageUrl ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          <Button
                            variant="outline"
                            className="h-11 w-full border-border/40 sm:w-auto"
                            render={<a href={post.imageUrl} download={getImageDownloadName(post)} />}
                          >
                            <Download />
                            Download Image
                          </Button>
                        </div>
                        <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
                          <TappableImage
                            src={post.imageUrl}
                            alt={`Image for ${post.title}`}
                            className="h-auto max-h-[28rem] w-full object-cover"
                          />
                        </div>
                      </div>
                    ) : null}

                    <div className="grid gap-3 sm:grid-cols-2">
                      {post.approvalStatus !== "approved" ? (
                        <Button className="h-11 w-full justify-center" onClick={() => openDialog(post.id, "approved")}>
                          <Check />
                          Approve
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-center border-border/40"
                        onClick={() => openDialog(post.id, "edit")}
                      >
                        <PencilLine />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        className="h-11 w-full justify-center border-border/40"
                        onClick={() => openDialog(post.id, "comment")}
                      >
                        <MessageSquareText />
                        Comment
                      </Button>
                      {post.approvalStatus !== "rejected" ? (
                        <Button
                          variant="destructive"
                          className="h-11 w-full justify-center"
                          onClick={() => openDialog(post.id, "rejected")}
                        >
                          <X />
                          Reject
                        </Button>
                      ) : null}
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-base font-medium">Feedback thread</p>
                        <span className="text-xs text-muted-foreground">
                          {post.comments.length} comments
                        </span>
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
                  </div>
                </div>
              ) : null}
            </Surface>
          );
        })
      )}

      <DraftActionDialog
        post={activePost}
        mode={dialogMode}
        open={Boolean(activePost && dialogMode)}
        onOpenChange={(open) => {
          if (!open) {
            setDialogMode(null);
          }
        }}
      />
    </div>
  );
}

function AnalyticsView() {
  const { data, saveMetrics } = useContentHub();
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [metrics, setMetrics] = useState({
    impressions: "",
    comments: "",
    reposts: "",
    reactions: "",
    followerDelta: "",
  });

  const posted = data.posts.filter((post) => post.metrics || post.status === "posted");
  const sortedByImpressions = [...posted].sort(
    (left, right) => safeNumber(right.metrics?.impressions) - safeNumber(left.metrics?.impressions),
  );
  const totalImpressions = posted.reduce((sum, post) => sum + safeNumber(post.metrics?.impressions), 0);
  const totalComments = posted.reduce((sum, post) => sum + safeNumber(post.metrics?.comments), 0);
  const avgImpressions = posted.length ? Math.round(totalImpressions / posted.length) : 0;
  const bestPost = sortedByImpressions[0];
  const chartData = data.analytics.map((entry) => ({
    date: format(new Date(`${entry.date}T00:00:00`), "MMM d"),
    linkedin: entry.linkedinFollowers ?? null,
    substack: entry.substackSubscribers ?? null,
  }));
  const selectedPost = data.posts.find((post) => post.id === selectedPostId) ?? null;

  function openMetrics(postId: string) {
    const post = data.posts.find((entry) => entry.id === postId);
    setSelectedPostId(postId);
    setMetrics({
      impressions: String(post?.metrics?.impressions ?? ""),
      comments: String(post?.metrics?.comments ?? ""),
      reposts: String(post?.metrics?.reposts ?? ""),
      reactions: String(post?.metrics?.reactions ?? ""),
      followerDelta: String(post?.metrics?.followerDelta ?? ""),
    });
  }

  function submitMetrics() {
    if (!selectedPost) {
      return;
    }

    saveMetrics(selectedPost.id, {
      impressions: Number(metrics.impressions || 0),
      comments: Number(metrics.comments || 0),
      reposts: Number(metrics.reposts || 0),
      reactions: Number(metrics.reactions || 0),
      followerDelta: Number(metrics.followerDelta || 0),
    });
    setSelectedPostId(null);
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          label="Total Impressions"
          value={totalImpressions.toLocaleString()}
          hint="Across all tracked posts"
          icon={TrendingUp}
        />
        <StatCard
          label="Avg Impressions"
          value={avgImpressions.toLocaleString()}
          hint="Mean per published post"
          icon={BarChart3}
        />
        <StatCard
          label="Best Post"
          value={
            bestPost
              ? bestPost.title.slice(0, 18) + (bestPost.title.length > 18 ? "…" : "")
              : "N/A"
          }
          hint={
            bestPost
              ? `${safeNumber(bestPost.metrics?.impressions).toLocaleString()} impressions`
              : "No published posts"
          }
          icon={Flame}
        />
        <StatCard
          label="Total Comments"
          value={totalComments.toLocaleString()}
          hint="Signals audience conversation"
          icon={MessageSquareText}
        />
      </div>

      <Surface>
        <div className="mb-4">
          <h3 className="text-xl font-bold tracking-tight sm:text-lg sm:font-semibold">Impressions Over Time</h3>
        </div>

        <div className="h-56 w-full sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <RechartsTooltip
                contentStyle={{
                  borderRadius: 16,
                  border: "1px solid var(--border)",
                  background: "var(--card)",
                }}
              />
              <Line
                dataKey="linkedin"
                type="monotone"
                stroke={LINKEDIN_COLOR}
                strokeWidth={2.5}
                dot={{ fill: LINKEDIN_COLOR, strokeWidth: 0 }}
              />
              <Line
                dataKey="substack"
                type="monotone"
                stroke={SUBSTACK_COLOR}
                strokeWidth={2.5}
                dot={{ fill: SUBSTACK_COLOR, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Surface>

      <Surface>
        <div className="mb-4">
          <h3 className="text-xl font-bold tracking-tight sm:text-lg sm:font-semibold">Posted Content</h3>
        </div>

        <div className="space-y-3">
          {sortedByImpressions.map((post) => (
            <div
              key={post.id}
              className="rounded-2xl border border-border/40 bg-background/60 p-4"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap gap-2">
                    <PlatformBadge platform={post.platform} />
                    <PostTypeBadge postType={post.postType} />
                  </div>
                  <p className="mt-3 text-lg font-semibold leading-6">{post.title}</p>
                  <p className="mt-1 text-base text-muted-foreground">
                    {format(parseISO(post.scheduledAt), "MMM d, yyyy")}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="h-11 border-border/40 sm:shrink-0"
                  onClick={() => openMetrics(post.id)}
                >
                  <PencilLine />
                  Enter metrics
                </Button>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div>
                  <div className="text-muted-foreground">Impressions</div>
                  <div className="text-xl font-semibold">
                    {safeNumber(post.metrics?.impressions).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Comments</div>
                  <div className="text-xl font-semibold">
                    {safeNumber(post.metrics?.comments).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reposts</div>
                  <div className="text-xl font-semibold">
                    {safeNumber(post.metrics?.reposts).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Reactions</div>
                  <div className="text-xl font-semibold">
                    {safeNumber(post.metrics?.reactions).toLocaleString()}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Surface>

      <Dialog open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPostId(null)}>
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
            <Button variant="outline" className="h-12 text-base" onClick={() => setSelectedPostId(null)}>
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<TabId>(() => parseTab(searchParams.get("tab")));

  function setActiveTab(nextTab: TabId) {
    setActiveTabState(nextTab);
    setMobileNavOpen(false);

    // Update URL in background (non-blocking)
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "calendar") {
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
        <div className="mx-auto flex min-h-18 max-w-3xl items-center justify-between gap-3 px-4 py-3">
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

      <main className="mx-auto flex-1 max-w-3xl px-4 py-4 pb-24 sm:py-5">
        {activeTab === "calendar" ? <CalendarView /> : null}
        {activeTab === "ideas" ? <IdeasView /> : null}
        {activeTab === "drafts" ? <DraftsView /> : null}
        {activeTab === "analytics" ? <AnalyticsView /> : null}
        {activeTab === "settings" ? <SettingsView /> : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/92 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-5">
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
