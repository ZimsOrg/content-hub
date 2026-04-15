"use client";

import Image from "next/image";
import { createContext, useContext, useEffect, useId, useRef, useState, useTransition, type ChangeEvent, type MouseEvent } from "react";
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
  Archive,
  ArchiveRestore,
  Download,
  Eye,
  EyeOff,
  ImageIcon,
  Key,
  LayoutGrid,
  Link2,
  LoaderCircle,
  Maximize2,
  Menu,
  Minimize2,
  Moon,
  PanelLeft,
  PencilLine,
  Plus,
  Search,
  Send,
  Settings2,
  Sparkles,
  Sun,
  Trash2,
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
import { DatePicker } from "@/components/DatePicker";
import { cn } from "@/lib/utils";
import { useContentHub } from "@/lib/store";
import type {
  ApiKeyEntry,
  ApprovalStatus,
  CustomOptions,
  Idea,
  Platform,
  Post,
  PostPlatform,
  PostStatus,
  PostType,
  ResearchConfig,
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
  { id: "research", label: "Research", icon: Search, description: "AI content research" },
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
  approved: "Approved",
  posted: "Posted",
} as const;

const APPROVAL_STATUS_META = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  "needs-revision": "Needs Revision",
} as const;


const WEEKDAY_OPTIONS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const IDEA_STATUS_OPTIONS: { value: Idea["status"]; label: string }[] = [
  { value: "new", label: IDEA_STATUS_META.new },
  { value: "developing", label: IDEA_STATUS_META.developing },
  { value: "ready", label: IDEA_STATUS_META.ready },
];

const POST_STATUS_OPTIONS: { value: Post["status"]; label: string }[] = [
  { value: "idea", label: POST_STATUS_META.idea },
  { value: "draft", label: POST_STATUS_META.draft },
  { value: "approved", label: POST_STATUS_META.approved },
  { value: "posted", label: POST_STATUS_META.posted },
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


function postMatchesDate(post: Post, date: Date) {
  return isSameDay(parseISO(post.scheduledAt), date);
}

function sortPostsByScheduledDate(posts: Post[]) {
  return [...posts].sort(
    (left, right) => parseISO(left.scheduledAt).getTime() - parseISO(right.scheduledAt).getTime(),
  );
}

function sortByNewest<T extends { createdAt: string }>(items: T[]) {
  return [...items].sort(
    (left, right) => parseISO(right.createdAt).getTime() - parseISO(left.createdAt).getTime(),
  );
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

function PlatformBadge({ platform }: { platform: Platform }) {
  const meta = PLATFORM_META[platform];
  return (
    <Badge className={cn("ring-1 ring-inset", meta.pill)} variant="outline">
      <Circle className="size-2 fill-current" />
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

function CardStatusSelect({
  value,
  options,
  disabled = false,
  onChange,
}: {
  value: string;
  options: { value: string; label: string }[];
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="font-medium">Status</span>
      <select
        className="h-9 rounded-lg border border-border/50 bg-background px-3 text-sm text-foreground outline-none transition focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60"
        value={value}
        disabled={disabled}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => {
          event.stopPropagation();
          onChange(event.target.value);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
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
                <DatePicker
                  value={selectedDate}
                  onChange={setSelectedDate}
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

function EditableContentBlock({
  label,
  value,
  onSave,
  placeholder,
}: {
  label: string;
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function save() {
    if (draft !== value) {
      onSave(draft);
    }
    setEditing(false);
    setExpanded(false);
  }

  function cancel() {
    setDraft(value);
    setEditing(false);
    setExpanded(false);
  }

  if (!editing) {
    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-foreground">{label}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-2.5 text-muted-foreground hover:text-foreground"
            onClick={() => setEditing(true)}
          >
            <PencilLine className="size-3.5" />
            Edit
          </Button>
        </div>
        <pre className="font-sans whitespace-pre-wrap break-words overflow-hidden text-base leading-7 text-foreground">
          {value || placeholder || "Nothing yet."}
        </pre>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
            {expanded ? "Collapse" : "Expand"}
          </Button>
          <Button type="button" size="sm" className="h-8" onClick={save}>
            Save
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-8" onClick={cancel}>
            Cancel
          </Button>
        </div>
      </div>
      <Textarea
        id={id}
        value={draft}
        placeholder={placeholder}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            save();
          }
        }}
        className={cn(
          "w-full resize-y font-sans text-base leading-7 transition-[max-height] duration-200",
          expanded
            ? "min-h-[16rem] max-h-[min(75vh,40rem)]"
            : "min-h-[8rem] max-h-[16rem]",
        )}
      />
      <p className="text-xs text-muted-foreground">⌘/Ctrl + Enter to save</p>
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
  onMovePostStatus,
  onArchiveIdea,
  onArchivePost,
  onDeleteIdea,
  onDeletePost,
  onEditPost,
}: {
  idea: Idea | null;
  post: Post | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onScheduleIdea: (idea: Idea) => void;
  onMoveIdeaStatus: (ideaId: string, status: Idea["status"]) => void;
  onMovePostStatus: (postId: string, status: Post["status"]) => void;
  onArchiveIdea: (ideaId: string, archived: boolean) => void;
  onArchivePost: (postId: string, archived: boolean) => void;
  onDeleteIdea: (ideaId: string) => void;
  onEditPost: (postId: string) => void;
  onDeletePost: (postId: string) => void;
}) {
  const { savePostContent, updateIdea, updatePost } = useContentHub();
  const activeIdea = idea;
  const activePost = post;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-x-hidden !p-0 !inset-0 !bottom-0 !max-h-full !rounded-t-none sm:!inset-auto sm:!top-1/2 sm:!left-1/2 sm:!bottom-auto sm:!-translate-x-1/2 sm:!-translate-y-1/2 sm:!rounded-xl sm:max-w-2xl sm:!max-h-[85vh] sm:!p-0">
        <div className="overflow-y-auto overflow-x-hidden p-5 pt-16 sm:pt-5 max-h-[100vh] sm:max-h-[85vh]">
        {activeIdea ? (
          <>
            <DialogHeader className="pr-12 overflow-hidden pt-2 pb-3 border-b border-border/40">
              <DialogTitle className="text-xl leading-tight">{activeIdea.title}</DialogTitle>
              <div className="flex flex-wrap gap-2">
                <Badge className={cn("ring-1 ring-inset", PRIORITY_META[activeIdea.priority].badge)} variant="outline">
                  {PRIORITY_META[activeIdea.priority].label}
                </Badge>
                <PlatformBadge platform={activeIdea.platform} />
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <EditableContentBlock
                label="Description"
                value={activeIdea.description ?? ""}
                placeholder="Add a description…"
                onSave={(next) => updateIdea(activeIdea.id, { description: next })}
              />

              {activeIdea.imagePrompt ? (
                <ImagePromptBlock prompt={activeIdea.imagePrompt} />
              ) : null}

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


              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1 border-border/40 gap-2"
                  onClick={() => { onArchiveIdea(activeIdea.id, !activeIdea.archived); onOpenChange(false); }}
                >
                  {activeIdea.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                  {activeIdea.archived ? "Unarchive" : "Archive"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 border-border/40 gap-2 text-destructive hover:bg-destructive/10"
                  onClick={() => { onDeleteIdea(activeIdea.id); onOpenChange(false); }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          </>
        ) : null}

        {activePost ? (
          <>
            <DialogHeader className="pr-12 overflow-hidden pt-2 pb-3 border-b border-border/40">
              <DialogTitle className="text-xl leading-tight">{activePost.title}</DialogTitle>
              <div className="flex flex-wrap items-center gap-2">
                <PlatformBadge platform={activePost.platform} />
                <StatusBadge value={activePost.status} />
                {(activePost.status === "approved" || activePost.status === "posted") && (
                  <span className="text-sm text-muted-foreground">
                    {format(parseISO(activePost.scheduledAt), "MMM d")}
                  </span>
                )}
              </div>
            </DialogHeader>

            <div className="space-y-5">
              <CardStatusSelect
                value={activePost.status}
                options={POST_STATUS_OPTIONS}
                onChange={(status) => onMovePostStatus(activePost.id, status as Post["status"])}
              />

              {activePost.status === "draft" && (
                <Button
                  className="h-11 w-full gap-2 text-base"
                  onClick={() => { onEditPost(activePost.id); onOpenChange(false); }}
                >
                  <PencilLine className="size-4" />
                  Open Draft Editor
                </Button>
              )}

              {(activePost.status === "approved" || activePost.status === "posted") && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Posting Date</label>
                  <DatePicker
                    value={parseISO(activePost.scheduledAt)}
                    onChange={(d) => {
                      if (d) {
                        d.setHours(9, 0, 0, 0);
                        updatePost(activePost.id, { scheduledAt: d.toISOString() });
                      }
                    }}
                  />
                </div>
              )}

              <EditableContentBlock
                label="Content"
                value={activePost.content}
                placeholder="Write or paste your post…"
                onSave={(next) => savePostContent(activePost.id, next)}
              />

              <div className="flex flex-wrap gap-2">
                <CopyPostButton content={activePost.content} label="Copy Text" className="w-full sm:w-auto" />
                {activePost.imageUrl ? (
                  <Button
                    variant="outline"
                    className="h-11 w-full border-border/40 sm:w-auto"
                    nativeButton={false}
                    render={<a href={activePost.imageUrl} download={getImageDownloadName(activePost)} />}
                  >
                    <Download />
                    Download Image
                  </Button>
                ) : null}
              </div>

              {activePost.imageUrl ? (
                <div className="overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
                  <TappableImage
                    src={activePost.imageUrl}
                    alt={`Image for ${activePost.title}`}
                    className="h-auto w-full object-contain max-h-[28rem]"
                  />
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-11 flex-1 border-border/40 gap-2"
                  onClick={() => { onArchivePost(activePost.id, !activePost.archived); onOpenChange(false); }}
                >
                  {activePost.archived ? <ArchiveRestore className="size-4" /> : <Archive className="size-4" />}
                  {activePost.archived ? "Unarchive" : "Archive"}
                </Button>
                <Button
                  variant="outline"
                  className="h-11 border-border/40 gap-2 text-destructive hover:bg-destructive/10"
                  onClick={() => { onDeletePost(activePost.id); onOpenChange(false); }}
                >
                  <Trash2 className="size-4" />
                  Delete
                </Button>
              </div>
            </div>
          </>
        ) : null}
      </div>
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
                    nativeButton={false}
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
  const agenda = sortPostsByScheduledDate(calendarPosts.filter((post) => postMatchesDate(post, selectedDate)));
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
            const posts = sortPostsByScheduledDate(calendarPosts.filter((post) => postMatchesDate(post, date)));
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

function simpleMarkdownToHtml(md: string): string {
  return md
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/^&gt; (.+)$/gm, "<blockquote><p>$1</p></blockquote>")
    .replace(/^---$/gm, "<hr />")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[IMAGE: (.+?)\]/g, '<div class="rounded-lg border-2 border-dashed border-border/50 bg-muted/20 px-4 py-3 text-sm text-muted-foreground my-4">📷 <strong>Image:</strong> $1</div>')
    .replace(/^(\d+)\. (.+)$/gm, "<li>$1. $2</li>")
    .replace(/^- (.+)$/gm, "<li>• $1</li>")
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br />")
    .replace(/^/, "<p>")
    .replace(/$/, "</p>");
}

function compressImageFile(file: File, maxWidth = 800, quality = 0.7): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      const ctx = canvas.getContext("2d");
      ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.src = URL.createObjectURL(file);
  });
}

function parseSectionPrompts(text: string): { label: string; prompt: string }[] {
  const sections: { label: string; prompt: string }[] = [];
  const heroMatch = text.match(/^Hero:\s*([\s\S]+?)(?=\n\nSection \d|$)/);
  if (heroMatch) sections.push({ label: "Hero", prompt: heroMatch[1].trim() });

  const sectionRegex = /Section (\d+):\s*([\s\S]+?)(?=\n\nSection \d|$)/g;
  let match;
  while ((match = sectionRegex.exec(text)) !== null) {
    sections.push({ label: `Section ${match[1]}`, prompt: match[2].trim() });
  }

  if (sections.length === 0 && text.trim()) {
    sections.push({ label: "Image", prompt: text.trim() });
  }

  return sections;
}

function DraftImageSection({
  imageUrl,
  imagePromptText,
  generatingImage,
  sectionImages,
  onSetSectionImages,
  onSetImageUrl,
  onSetImagePromptText,
  onGenerateImage,
  onUploadClick,
}: {
  imageUrl: string;
  imagePromptText: string;
  generatingImage: boolean;
  sectionImages: Record<number, string>;
  onSetSectionImages: (fn: (prev: Record<number, string>) => Record<number, string>) => void;
  onSetImageUrl: (url: string) => void;
  onSetImagePromptText: (text: string) => void;
  onGenerateImage: (prompt: string) => Promise<void>;
  onUploadClick: () => void;
}) {
  const sections = parseSectionPrompts(imagePromptText);
  const hasMultiple = sections.length > 1;
  const [generatingIdx, setGeneratingIdx] = useState<number | null>(null);
  const sectionFileRefs = useRef<Record<number, HTMLInputElement | null>>({});

  async function generateSection(idx: number) {
    setGeneratingIdx(idx);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: sections[idx].prompt }),
      });
      const data = await res.json();
      if (data.url) {
        onSetSectionImages((prev) => ({ ...prev, [idx]: data.url }));
        if (idx === 0 && !imageUrl) {
          onSetImageUrl(data.url);
        }
      }
    } finally {
      setGeneratingIdx(null);
    }
  }

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium">Images</label>

      {/* Hero / main image */}
      {imageUrl ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl border border-border/40">
            <img src={imageUrl} alt="Post image" className="h-auto w-full object-contain max-h-72" />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9" onClick={onUploadClick}>Replace</Button>
            <Button
              variant="outline" size="sm" className="h-9 gap-1.5"
              disabled={generatingImage || !imagePromptText.trim()}
              onClick={() => onGenerateImage(sections[0]?.prompt || imagePromptText)}
            >
              {generatingImage ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              Regenerate
            </Button>
            <Button variant="outline" size="sm" className="h-9 text-destructive hover:bg-destructive/10" onClick={() => onSetImageUrl("")}>Remove</Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button variant="outline" className="h-11 flex-1 gap-2 border-dashed border-border/50" onClick={onUploadClick}>
            <ImageIcon className="size-4" /> Upload
          </Button>
          <Button
            className="h-11 flex-1 gap-2"
            disabled={generatingImage || !imagePromptText.trim()}
            onClick={() => onGenerateImage(sections[0]?.prompt || imagePromptText)}
          >
            {generatingImage ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generatingImage ? "Generating…" : "Generate Hero"}
          </Button>
        </div>
      )}

      {/* Section images for Substack */}
      {hasMultiple ? (
        <div className="space-y-3">
          <p className="text-xs font-medium text-muted-foreground">Section Images ({sections.length - 1})</p>
          {sections.slice(1).map((sec, i) => {
            const idx = i + 1;
            const secImg = sectionImages[idx];
            const isGen = generatingIdx === idx;
            return (
              <div key={idx} className="rounded-lg border border-border/40 bg-muted/10 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{sec.label}</span>
                  <div className="flex gap-1.5">
                    <Button
                      variant="outline" size="sm" className="h-8 gap-1.5"
                      onClick={() => sectionFileRefs.current[idx]?.click()}
                    >
                      <ImageIcon className="size-3.5" />
                      {secImg ? "Replace" : "Upload"}
                    </Button>
                    <Button
                      size="sm" className="h-8 gap-1.5"
                      disabled={isGen}
                      onClick={() => generateSection(idx)}
                    >
                      {isGen ? <LoaderCircle className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
                      {isGen ? "Generating…" : "Generate"}
                    </Button>
                    {secImg && (
                      <Button
                        variant="outline" size="sm" className="h-8 text-destructive hover:bg-destructive/10"
                        onClick={() => onSetSectionImages((prev) => { const next = { ...prev }; delete next[idx]; return next; })}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{sec.prompt}</p>
                {secImg ? (
                  <div className="overflow-hidden rounded-lg border border-border/40">
                    <img src={secImg} alt={sec.label} className="h-auto w-full object-contain max-h-56" />
                  </div>
                ) : null}
                <input
                  ref={(el) => { sectionFileRefs.current[idx] = el; }}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      compressImageFile(file).then((url) => onSetSectionImages((prev) => ({ ...prev, [idx]: url })));
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Editable prompt */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Image Prompt{hasMultiple ? "s" : ""}</label>
        <Textarea
          className="min-h-[4rem] resize-y text-sm leading-6"
          placeholder="Describe the image you want: style, subject, composition, mood…"
          value={imagePromptText}
          onChange={(e) => onSetImagePromptText(e.target.value)}
        />
      </div>
    </div>
  );
}

function DraftEditorOverlay({
  post,
  onClose,
}: {
  post: Post | null;
  onClose: () => void;
}) {
  const { savePostContent, updatePost } = useContentHub();
  const [prompt, setPrompt] = useState("");
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [sysPromptExpanded, setSysPromptExpanded] = useState(false);
  const [sysPromptText, setSysPromptText] = useState("");
  const [sysPromptDefault, setSysPromptDefault] = useState("");
  const [sysPromptCustom, setSysPromptCustom] = useState(false);
  const [savingSysPrompt, setSavingSysPrompt] = useState(false);
  const sysPromptLoadedRef = useRef(false);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [editingContent, setEditingContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePromptText, setImagePromptText] = useState("");
  const [sectionImages, setSectionImages] = useState<Record<number, string>>({});
  const [generatingImage, setGeneratingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (post) {
      setEditingContent(post.content || "");
      setImageUrl(post.imageUrl || "");
      setImagePromptText(post.imagePrompt || "");
      const savedSections: Record<number, string> = {};
      (post.sectionImages || []).forEach((url, i) => { if (url) savedSections[i + 1] = url; });
      setSectionImages(savedSections);
      setGeneratedContent(null);
      setError(null);
      if (!prompt && post.title) {
        setPrompt(`Write a ${post.platform === "substack" ? "long-form Substack article" : "LinkedIn post"} about: ${post.title}`);
      }
    }
  }, [post?.id]);

  useEffect(() => {
    if (sysPromptLoadedRef.current || !post) return;
    sysPromptLoadedRef.current = true;
    fetch("/api/settings/generate-prompts")
      .then((r) => r.json())
      .then((d) => {
        const p = post.platform === "substack" ? d.substack : d.linkedin;
        setSysPromptText(p.prompt);
        setSysPromptCustom(p.isCustom);
        setSysPromptDefault(post.platform === "substack" ? d.defaults.substack : d.defaults.linkedin);
      })
      .catch(() => {});
  }, [post?.id]);

  if (!post) return null;

  const isLinkedIn = post.platform === "linkedin";
  const isSubstack = post.platform === "substack";

  async function handleGenerate() {
    if (!prompt.trim() || !post) return;
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          platform: post.platform,
          title: post.title,
          description: post.content,
          imagePrompt: post.imagePrompt,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Generation failed");
        return;
      }

      setGeneratedContent(data.content);
      setEditingContent(data.content);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }

  function handleSave() {
    if (!post) return;
    savePostContent(post.id, editingContent);
    const sectionImgArray = Object.keys(sectionImages)
      .sort((a, b) => Number(a) - Number(b))
      .map((k) => sectionImages[Number(k)]);
    const patch: Partial<Post> = {};
    if (imageUrl !== (post.imageUrl || "")) patch.imageUrl = imageUrl || undefined;
    if (imagePromptText !== (post.imagePrompt || "")) patch.imagePrompt = imagePromptText || undefined;
    patch.sectionImages = sectionImgArray;
    updatePost(post.id, patch);
    onClose();
  }

  function handleUseGenerated() {
    if (generatedContent) {
      setEditingContent(generatedContent);
    }
  }

  function handleImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    compressImageFile(file).then(setImageUrl);
  }

  async function handleGenerateImage(imgPrompt: string) {
    setGeneratingImage(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: imgPrompt }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Image generation failed");
        return;
      }
      setImageUrl(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGeneratingImage(false);
    }
  }

  // LinkedIn preview: first 2 lines as hook
  const hookLines = editingContent.substring(0, 210).split("\n").slice(0, 2).join("\n");

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-background">
      <header className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold">{post.title}</h2>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium">{isLinkedIn ? "LinkedIn" : isSubstack ? "Substack" : post.platform}</span>
            <span>·</span>
            <span>Draft Editor</span>
            {generating && <LoaderCircle className="size-3.5 animate-spin" />}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button className="h-10" onClick={handleSave}>
            <Check className="size-4" />
            Save & Close
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-full border-border/50"
            onClick={onClose}
          >
            <X className="size-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
          {/* Prompt */}
          <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm"
              onClick={() => setPromptExpanded(!promptExpanded)}
            >
              <span className="font-medium">Prompt</span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", promptExpanded && "rotate-180")} />
            </button>
            {promptExpanded && (
              <div className="border-t border-border/40 px-4 py-3 space-y-2">
                <Textarea
                  className="min-h-[5rem] resize-y text-base leading-7"
                  placeholder={isLinkedIn
                    ? "e.g. Write a scroll-stopping LinkedIn post about..."
                    : "e.g. Write a deep-dive Substack article about..."
                  }
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
                <Button
                  className="h-10"
                  disabled={!prompt.trim() || generating}
                  onClick={handleGenerate}
                >
                  {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  {generating ? "Generating…" : "Generate"}
                </Button>
              </div>
            )}
          </div>

          {error ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm font-medium text-destructive">
              {error}
            </div>
          ) : null}

          {/* LinkedIn hook preview */}
          {isLinkedIn && editingContent.trim() ? (
            <div className="space-y-2">
              <label className="text-sm font-medium">Hook Preview <span className="font-normal text-muted-foreground">(what people see before &ldquo;...see more&rdquo;)</span></label>
              <div className="rounded-xl border border-border/40 bg-muted/20 px-4 py-3">
                <p className="font-sans text-base leading-7 text-foreground" style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2, overflow: "hidden" }}>{hookLines}</p>
                <p className="mt-1 text-sm text-blue-600 dark:text-blue-400">...see more</p>
              </div>
            </div>
          ) : null}

          {/* Generated output */}
          {generatedContent && generatedContent !== editingContent ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Generated Output</label>
                <div className="flex gap-2">
                  <CopyPostButton content={generatedContent} label="Copy" className="h-8" />
                  <Button size="sm" className="h-8" onClick={handleUseGenerated}>
                    Use This
                  </Button>
                </div>
              </div>
              <div className="rounded-xl border border-border/40 bg-muted/10 px-5 py-4 prose prose-sm dark:prose-invert max-w-none [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-0 [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-8 [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:leading-7 [&_p]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-foreground/20 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground [&_hr]:my-8 [&_ul]:space-y-1 [&_ol]:space-y-1 [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{ __html: simpleMarkdownToHtml(generatedContent) }}
              />
            </div>
          ) : null}

          {/* Content editor */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Content</label>
            <Textarea
              className={cn(
                "w-full resize-y font-sans text-base leading-7",
                isSubstack ? "min-h-[24rem]" : "min-h-[12rem]",
              )}
              value={editingContent}
              onChange={(e) => setEditingContent(e.target.value)}
              placeholder={isSubstack
                ? "Write your long-form article here..."
                : "Write your post here..."
              }
            />
            {isLinkedIn && editingContent.length > 0 ? (
              <p className={cn("text-xs", editingContent.length > 1300 ? "text-destructive" : "text-muted-foreground")}>
                {editingContent.length} / 1,300 characters
              </p>
            ) : null}
          </div>

          {/* Image */}
          <DraftImageSection
            imageUrl={imageUrl}
            imagePromptText={imagePromptText}
            generatingImage={generatingImage}
            sectionImages={sectionImages}
            onSetSectionImages={setSectionImages}
            onSetImageUrl={setImageUrl}
            onSetImagePromptText={setImagePromptText}
            onGenerateImage={handleGenerateImage}
            onUploadClick={() => fileInputRef.current?.click()}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
          />

          {/* System prompt editor */}
          <div className="rounded-xl border border-border/40 bg-muted/10 overflow-hidden">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm"
              onClick={() => setSysPromptExpanded(!sysPromptExpanded)}
            >
              <span className="flex items-center gap-2 font-medium">
                System Prompt ({isSubstack ? "Substack" : "LinkedIn"})
                {sysPromptCustom && <Badge variant="outline" className="text-xs ring-1 ring-inset ring-border/40">Custom</Badge>}
              </span>
              <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", sysPromptExpanded && "rotate-180")} />
            </button>
            {sysPromptExpanded && (
              <div className="border-t border-border/40 px-4 py-4 space-y-3">
                <p className="text-xs text-muted-foreground">
                  Controls how content is generated. Use {"{{title}}"} and {"{{context}}"} as placeholders.
                </p>
                <Textarea
                  className="min-h-[12rem] resize-y font-mono text-sm leading-6"
                  value={sysPromptText}
                  onChange={(e) => setSysPromptText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm" className="h-9" disabled={savingSysPrompt}
                    onClick={async () => {
                      setSavingSysPrompt(true);
                      try {
                        const res = await fetch("/api/settings/generate-prompts", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ platform: isSubstack ? "substack" : "linkedin", prompt: sysPromptText }),
                        });
                        const d = await res.json();
                        if (d.prompt) { setSysPromptText(d.prompt); setSysPromptCustom(d.isCustom); }
                      } finally { setSavingSysPrompt(false); }
                    }}
                  >
                    {savingSysPrompt ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Save
                  </Button>
                  <Button
                    size="sm" variant="outline" className="h-9" disabled={savingSysPrompt || !sysPromptCustom}
                    onClick={async () => {
                      setSavingSysPrompt(true);
                      setSysPromptText(sysPromptDefault);
                      try {
                        const res = await fetch("/api/settings/generate-prompts", {
                          method: "PUT",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ platform: isSubstack ? "substack" : "linkedin", prompt: null }),
                        });
                        const d = await res.json();
                        setSysPromptText(d.prompt); setSysPromptCustom(false);
                      } finally { setSavingSysPrompt(false); }
                    }}
                  >
                    Reset to Default
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function NewCardDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addIdea, addPost } = useContentHub();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [platform, setPlatform] = useState<Platform>("linkedin");
  const [postType, setPostType] = useState<PostType>("trenches");
  const [priority, setPriority] = useState<"high" | "medium" | "low">("medium");
  const [status, setStatus] = useState<PostStatus>("idea");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString();
  });

  function reset() {
    setTitle("");
    setContent("");
    setPlatform("linkedin");
    setPostType("trenches");
    setPriority("medium");
    setStatus("idea");
  }

  function handleSubmit() {
    if (!title.trim()) return;

    if (status === "idea") {
      addIdea({
        title: title.trim(),
        description: content.trim() || undefined,
        platform,
        postType,
        priority,
        status: "new",
        tags: [],
      });
    } else {
      addPost({
        title: title.trim(),
        content: content.trim(),
        platform: platform === "both" ? "linkedin" : platform,
        postType,
        scheduledAt,
        status,
      });
    }

    reset();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-lg">New Card</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Status</label>
            <div className="flex flex-wrap gap-2">
              {POST_STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant={status === opt.value ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setStatus(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Title</label>
            <Input
              className="h-11"
              placeholder="What's on your mind?"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Content <span className="font-normal text-muted-foreground">(optional)</span></label>
            <Textarea
              className="min-h-[6rem] resize-y text-base leading-7"
              placeholder="Describe the idea or write the post…"
              value={content}
              onChange={(e) => setContent(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Platform</label>
            <select
              className="h-11 w-full rounded-lg border border-border/50 bg-background px-3 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
              value={platform}
              onChange={(e) => setPlatform(e.target.value as Platform)}
            >
              <option value="both">Both</option>
              <option value="linkedin">LinkedIn</option>
              <option value="substack">Substack</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Priority</label>
            <div className="flex gap-2">
              {(["high", "medium", "low"] as const).map((p) => (
                <Button
                  key={p}
                  variant={priority === p ? "default" : "outline"}
                  className="h-10 flex-1"
                  onClick={() => setPriority(p)}
                >
                  {PRIORITY_META[p].label}
                </Button>
              ))}
            </div>
          </div>

          {(status === "approved" || status === "posted") ? (
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Posting Date</label>
              <DatePicker
                value={new Date(scheduledAt)}
                onChange={(d) => {
                  if (d) {
                    d.setHours(9, 0, 0, 0);
                    setScheduledAt(d.toISOString());
                  }
                }}
              />
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button className="h-12 text-base" disabled={!title.trim()} onClick={handleSubmit}>
            <Plus className="size-4" />
            Add Card
          </Button>
          <Button variant="outline" className="h-12 text-base" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BoardView({ onEditPost }: { onEditPost: (postId: string) => void }) {
  const { data, setIdeaStatus, setPostStatus, updateIdea, scheduleIdea, deleteIdea, deletePost, archiveIdea, archivePost, unarchiveIdea, unarchivePost } = useContentHub();
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [selectedCardType, setSelectedCardType] = useState<"idea" | "post" | null>(null);
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);
  const [savingStatusKey, setSavingStatusKey] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newCardOpen, setNewCardOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; type: "idea" | "post"; title: string } | null>(null);

  function confirmDelete(id: string, type: "idea" | "post", title: string) {
    setPendingDelete({ id, type, title });
  }

  function executeDelete() {
    if (!pendingDelete) return;
    if (pendingDelete.type === "idea") deleteIdea(pendingDelete.id);
    else deletePost(pendingDelete.id);
    setPendingDelete(null);
  }
  const ideas = sortByNewest(
    data.ideas.filter((idea) =>
      (showArchived || !idea.archived) &&
      (!idea.scheduledPostIds || idea.scheduledPostIds.length === 0),
    ),
  );
  const ideaPosts = sortByNewest(
    data.posts.filter((post) => post.status === "idea" && (showArchived || !post.archived)),
  );
  const archivedCount =
    data.ideas.filter((i) => i.archived).length +
    data.posts.filter((p) => p.archived).length;
  const selectedDialogIdea =
    selectedCardType === "idea" ? data.ideas.find((idea) => idea.id === selectedCardId) ?? null : null;
  const selectedDialogPost =
    selectedCardType === "post" ? data.posts.find((post) => post.id === selectedCardId) ?? null : null;

  async function handleIdeaStatusChange(ideaId: string, status: Idea["status"]) {
    const key = `idea:${ideaId}`;
    setSavingStatusKey(key);
    try {
      await setIdeaStatus(ideaId, status);
    } finally {
      setSavingStatusKey((current) => (current === key ? null : current));
    }
  }

  async function handlePostStatusChange(postId: string, status: Post["status"]) {
    const key = `post:${postId}`;
    setSavingStatusKey(key);
    try {
      await setPostStatus(postId, status);
      if (status === "idea") {
        const post = data.posts.find((p) => p.id === postId);
        if (post?.ideaId) {
          updateIdea(post.ideaId, { scheduledPostIds: [] });
        }
      }
    } finally {
      setSavingStatusKey((current) => (current === key ? null : current));
    }
  }

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
      posts: ideaPosts,
    },
    {
      id: "draft",
      title: "Draft",
      tone: "bg-amber-500/10",
      cardBorder: "bg-amber-50/60 dark:bg-amber-950/20",
      empty: "No pending drafts",
      posts: sortByNewest(
        data.posts.filter((post) => post.status === "draft" && (showArchived || !post.archived)),
      ),
    },
    {
      id: "approved",
      title: "Approved",
      tone: "bg-emerald-500/10",
      cardBorder: "bg-emerald-50/60 dark:bg-emerald-950/20",
      empty: "No approved content waiting",
      posts: sortByNewest(
        data.posts.filter((post) => post.approvalStatus === "approved" && post.status !== "posted" && (showArchived || !post.archived)),
      ),
    },
    {
      id: "posted",
      title: "Posted",
      tone: "bg-blue-500/10",
      cardBorder: "bg-blue-50/60 dark:bg-blue-950/20",
      empty: "No posted content yet",
      posts: sortByNewest(data.posts.filter((post) => post.status === "posted" && (showArchived || !post.archived))),
    },
  ];

  function openCardDialog(cardId: string, cardType: "idea" | "post") {
    setSelectedCardId(cardId);
    setSelectedCardType(cardType);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Button
          className="h-10 gap-2"
          onClick={() => setNewCardOpen(true)}
        >
          <Plus className="size-4" />
          New
        </Button>
        <Button
          variant={showArchived ? "default" : "outline"}
          className="h-10 gap-2 border-border/40"
          onClick={() => setShowArchived(!showArchived)}
        >
          <Archive className="size-4" />
          Archived
          {archivedCount > 0 && (
            <span className="flex size-5 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
              {archivedCount}
            </span>
          )}
        </Button>
      </div>

      {columns.every((column) => ((column.ideas?.length ?? 0) + (column.posts?.length ?? 0)) === 0) ? (
        <EmptyState
          icon={LayoutGrid}
          title="Board is empty"
          description="Add ideas or schedule content to start the pipeline."
        />
      ) : (
        <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 kanban-scroll lg:mx-0 lg:gap-6 lg:overflow-x-auto lg:px-0 lg:pb-4">
          {columns.map((column) => (
            <section
              key={column.id}
              className="flex w-[85vw] shrink-0 snap-center flex-col lg:w-[320px] lg:shrink-0 xl:w-[360px]"
            >
              <div
                className={cn(
                  "sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border/40 px-4 py-3",
                  column.tone,
                )}
              >
                <h3 className="truncate text-base font-bold tracking-tight">{column.title}</h3>
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-foreground/10 text-xs font-semibold">
                  {(column.ideas?.length ?? 0) + (column.posts?.length ?? 0)}
                </span>
              </div>

              <div className="mt-3 flex flex-col gap-3">
                {column.ideas?.map((idea) => {
                  const isArchived = idea.archived;
                  return (
                    <Surface key={idea.id} className={cn("w-full overflow-hidden p-0", column.cardBorder, isArchived && "opacity-60")}>
                      <div className="p-4 sm:p-5 lg:p-6">
                        <button
                          type="button"
                          className="flex min-w-0 w-full items-start justify-between gap-3 text-left"
                          onClick={() => openCardDialog(idea.id, "idea")}
                        >
                          <div className="min-w-0">
                            <p className="text-lg font-semibold leading-7">{idea.title}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              <Badge className={cn("ring-1 ring-inset", PRIORITY_META[idea.priority].badge)} variant="outline">
                                {PRIORITY_META[idea.priority].label}
                              </Badge>
                              <PlatformBadge platform={idea.platform} />
                              {isArchived && (
                                <Badge variant="outline" className="gap-1 ring-1 ring-inset ring-border/40 text-muted-foreground">
                                  <Archive className="size-3" /> Archived
                                </Badge>
                              )}
                            </div>
                          </div>
                        </button>
                        {idea.imagePrompt ? (
                          <div className="mt-3">
                            <ImagePromptBlock prompt={idea.imagePrompt} />
                          </div>
                        ) : null}
                        <div className="mt-4 space-y-2">
                          <CardStatusSelect
                            value="idea"
                            options={POST_STATUS_OPTIONS}
                            onChange={(status) => {
                              if (status !== "idea") {
                                const plat = idea.platform === "both" ? "linkedin" : idea.platform;
                                const tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);
                                tomorrow.setHours(9, 0, 0, 0);
                                scheduleIdea({
                                  ideaId: idea.id,
                                  title: idea.title,
                                  content: idea.description ?? "",
                                  scheduledAt: tomorrow.toISOString(),
                                  platform: plat as PostPlatform,
                                });
                                if (status !== "draft") {
                                  const newPost = data.posts.find((p) => p.ideaId === idea.id);
                                  if (newPost) {
                                    void handlePostStatusChange(newPost.id, status as Post["status"]);
                                  }
                                }
                              }
                            }}
                          />
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={(e: MouseEvent) => { e.stopPropagation(); isArchived ? unarchiveIdea(idea.id) : archiveIdea(idea.id); }}
                              title={isArchived ? "Unarchive" : "Archive"}
                            >
                              {isArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={(e: MouseEvent) => { e.stopPropagation(); confirmDelete(idea.id, "idea", idea.title); }}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Surface>
                  );
                })}

                {column.posts?.map((post) => {
                  const isSaving = savingStatusKey === `post:${post.id}`;
                  const isArchived = post.archived;

                  return (
                    <Surface key={post.id} className={cn("w-full overflow-hidden p-0", column.cardBorder, isArchived && "opacity-60")}>
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
                                {(post.status === "approved" || post.status === "posted") && (
                                  <span className="text-base text-muted-foreground">
                                    {format(parseISO(post.scheduledAt), "MMM d")}
                                  </span>
                                )}
                                {isArchived && (
                                  <Badge variant="outline" className="gap-1 ring-1 ring-inset ring-border/40 text-muted-foreground">
                                    <Archive className="size-3" /> Archived
                                  </Badge>
                                )}
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

                        {(() => {
                          const isValidSrc = (url: string) => url && !url.startsWith("blob:");
                          const allImages = [
                            ...(post.imageUrl && isValidSrc(post.imageUrl) ? [{ src: post.imageUrl }] : []),
                            ...(post.sectionImages ?? []).filter(isValidSrc).map((url) => ({ src: url })),
                          ];
                          if (allImages.length === 0) return null;
                          const cols = allImages.length === 1 ? "grid-cols-1" : allImages.length === 2 ? "grid-cols-2" : "grid-cols-3";
                          return (
                            <div className={cn("mt-4 grid gap-1.5", cols)}>
                              {allImages.map((img, i) => (
                                <TappableImage
                                  key={i}
                                  src={img.src}
                                  alt=""
                                  className={cn(
                                    "w-full rounded-lg border border-border/40 object-cover",
                                    allImages.length === 1 ? "h-36" : "h-20",
                                  )}
                                />
                              ))}
                            </div>
                          );
                        })()}

                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <CardStatusSelect
                              value={post.status}
                              options={POST_STATUS_OPTIONS}
                              disabled={isSaving}
                              onChange={(status) => {
                                void handlePostStatusChange(post.id, status as Post["status"]);
                              }}
                            />
                            {isSaving ? <LoaderCircle className="size-4 animate-spin text-muted-foreground" /> : null}
                          </div>
                          <div className="flex justify-end gap-1">
                            {post.status === "draft" && (
                              <Button
                                variant="ghost"
                                size="icon-lg"
                                className="size-8 text-muted-foreground hover:text-foreground"
                                onClick={(e: MouseEvent) => { e.stopPropagation(); onEditPost(post.id); }}
                                title="Edit Draft"
                              >
                                <PencilLine className="size-3.5" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              className="size-8 text-muted-foreground hover:text-foreground"
                              onClick={(e: MouseEvent) => { e.stopPropagation(); isArchived ? unarchivePost(post.id) : archivePost(post.id); }}
                              title={isArchived ? "Unarchive" : "Archive"}
                            >
                              {isArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-lg"
                              className="size-8 text-muted-foreground hover:text-destructive"
                              onClick={(e: MouseEvent) => { e.stopPropagation(); confirmDelete(post.id, "post", post.title); }}
                              title="Delete"
                            >
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Surface>
                  );
                })}

                {((column.ideas?.length ?? 0) + (column.posts?.length ?? 0)) === 0 ? (
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
        onMoveIdeaStatus={(ideaId, status) => {
          void handleIdeaStatusChange(ideaId, status);
        }}
        onMovePostStatus={(postId, status) => {
          void handlePostStatusChange(postId, status);
        }}
        onArchiveIdea={(ideaId, archived) => { archived ? archiveIdea(ideaId) : unarchiveIdea(ideaId); }}
        onArchivePost={(postId, archived) => { archived ? archivePost(postId) : unarchivePost(postId); }}
        onDeleteIdea={(id) => { const i = data.ideas.find((x) => x.id === id); confirmDelete(id, "idea", i?.title ?? ""); }}
        onDeletePost={(id) => { const p = data.posts.find((x) => x.id === id); confirmDelete(id, "post", p?.title ?? ""); }}
        onEditPost={onEditPost}
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

      <NewCardDialog open={newCardOpen} onOpenChange={setNewCardOpen} />

      <Dialog open={Boolean(pendingDelete)} onOpenChange={(open) => { if (!open) setPendingDelete(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-lg">Delete card?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{pendingDelete?.title}</span> will be permanently deleted. This cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="destructive"
              className="h-11 text-base"
              onClick={() => { executeDelete(); }}
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
            <Button variant="outline" className="h-11 text-base" onClick={() => setPendingDelete(null)}>
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

        <CustomOptionsSettingsSection />
        <OpenRouterKeySection />
        <ModelsSection />
    </div>
  );
}

function OpenRouterKeySection() {
  const [hasKey, setHasKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings/keys")
      .then((r) => r.json())
      .then((data: ApiKeyEntry[]) => {
        const entry = data.find((e) => e.provider === "openrouter");
        setHasKey(entry?.hasKey ?? false);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  async function saveKey() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openrouter", key: keyInput }),
      });
      const updated: ApiKeyEntry[] = await res.json();
      const entry = updated.find((e) => e.provider === "openrouter");
      setHasKey(entry?.hasKey ?? false);
      setEditing(false);
      setKeyInput("");
      setShowKey(false);
    } finally {
      setSaving(false);
    }
  }

  async function removeKey() {
    const res = await fetch("/api/settings/keys", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "openrouter", key: "" }),
    });
    const updated: ApiKeyEntry[] = await res.json();
    const entry = updated.find((e) => e.provider === "openrouter");
    setHasKey(entry?.hasKey ?? false);
  }

  return (
    <Card className="border border-border/40 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Key className="size-5" /> OpenRouter API Key</CardTitle>
        <CardDescription>All AI features use OpenRouter. Enter your API key to enable research and generation.</CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading…
          </div>
        ) : editing ? (
          <div className="space-y-3">
            <div className="relative">
              <Input
                className="h-11 pr-10 font-mono text-sm"
                type={showKey ? "text" : "password"}
                placeholder="sk-or-v1-…"
                value={keyInput}
                onChange={(e) => setKeyInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && keyInput.trim()) saveKey(); }}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
            <div className="flex gap-2">
              <Button className="h-10" disabled={saving || !keyInput.trim()} onClick={saveKey}>Save</Button>
              <Button variant="outline" className="h-10" onClick={() => { setEditing(false); setKeyInput(""); setShowKey(false); }}>Cancel</Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/40 px-4 py-3">
            <div>
              <p className="font-medium">OpenRouter</p>
              <p className="text-xs text-muted-foreground">{hasKey ? "Key configured" : "Not set"}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="h-9" onClick={() => { setEditing(true); setKeyInput(""); setShowKey(false); }}>
                {hasKey ? "Update" : "Add Key"}
              </Button>
              {hasKey && (
                <Button size="sm" variant="ghost" className="h-9 text-muted-foreground hover:text-destructive" onClick={removeKey}>
                  <Trash2 className="size-3.5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ModelsSection() {
  const [config, setConfig] = useState<ResearchConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/settings/research-config")
      .then((res) => res.json())
      .then((data) => { setConfig(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  async function save(patch: Partial<ResearchConfig>) {
    const res = await fetch("/api/settings/research-config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated = await res.json();
    setConfig(updated);
  }

  if (loading || !config) {
    return (
      <Card className="border border-border/40 bg-card/80 backdrop-blur">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading models…
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border border-border/40 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Sparkles className="size-5" /> Models (OpenRouter)</CardTitle>
        <CardDescription>Enter OpenRouter model names for each task. All calls go through your OpenRouter key.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-3">
          {([
            ["defaultModel", "Default / Writing", "anthropic/claude-sonnet-4"],
            ["searchModel", "Search / Research", "perplexity/sonar-pro"],
            ["imageModel", "Image Generation", "google/gemini-2.5-flash-preview-05-20"],
          ] as const).map(([field, label, placeholder]) => (
            <div key={field} className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">{label}</label>
              <Input
                className="h-10 text-sm font-mono"
                placeholder={placeholder}
                value={config[field]}
                onChange={(e) => setConfig({ ...config, [field]: e.target.value })}
                onBlur={() => save({ [field]: config[field] })}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function useCustomOptions() {
  const [options, setOptions] = useState<CustomOptions>({ topics: [], channels: [], voices: [], audiences: [] });
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/settings/custom-options")
      .then((r) => r.json())
      .then((d) => { setOptions(d); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, []);

  async function saveOptions(patch: Partial<CustomOptions>) {
    const merged = { ...options, ...patch };
    setOptions(merged);
    const res = await fetch("/api/settings/custom-options", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const updated = await res.json();
    if (!("error" in updated)) setOptions(updated);
  }

  return { options, loaded, saveOptions };
}

function EditableTagList({
  label,
  description,
  items,
  onAdd,
  onRemove,
  placeholder,
}: {
  label: string;
  description?: string;
  items: string[];
  onAdd: (value: string) => void;
  onRemove: (index: number) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function handleAdd() {
    const trimmed = input.trim();
    if (!trimmed || items.includes(trimmed)) return;
    onAdd(trimmed);
    setInput("");
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item, i) => (
          <Badge key={i} variant="outline" className="gap-1.5 ring-1 ring-inset ring-border/40 pr-1.5">
            {item}
            <button
              type="button"
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
              onClick={() => onRemove(i)}
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        {items.length === 0 ? <span className="text-sm text-muted-foreground">None added yet</span> : null}
      </div>
      <div className="flex gap-2">
        <Input
          className="h-10 flex-1"
          placeholder={placeholder}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAdd(); } }}
        />
        <Button variant="outline" className="h-10" disabled={!input.trim()} onClick={handleAdd}>
          Add
        </Button>
      </div>
    </div>
  );
}

function CustomOptionsSettingsSection() {
  const { options, loaded, saveOptions } = useCustomOptions();

  if (!loaded) {
    return (
      <Card className="border border-border/40 bg-card/80 backdrop-blur">
        <CardContent className="py-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <LoaderCircle className="size-4 animate-spin" /> Loading options…
          </div>
        </CardContent>
      </Card>
    );
  }

  const sections: { key: keyof CustomOptions; label: string; desc: string; placeholder: string }[] = [
    { key: "topics", label: "Topic Focus", desc: "Niches and themes the research engine explores.", placeholder: "e.g. AI Side Projects" },
    { key: "channels", label: "Target Channels", desc: "Platforms you publish to.", placeholder: "e.g. Threads" },
    { key: "voices", label: "Brand Voice", desc: "Tone options when generating content.", placeholder: "e.g. Witty" },
    { key: "audiences", label: "Target Audience", desc: "Who you're writing for.", placeholder: "e.g. CTOs" },
  ];

  return (
    <Card className="border border-border/40 bg-card/80 backdrop-blur">
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Search className="size-5" /> Research Options</CardTitle>
        <CardDescription>Manage the topics, channels, voices, and audiences available in the Research tab.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {sections.map(({ key, label, desc, placeholder }) => (
          <EditableTagList
            key={key}
            label={label}
            description={desc}
            items={options[key]}
            placeholder={placeholder}
            onAdd={(v) => saveOptions({ [key]: [...options[key], v] })}
            onRemove={(i) => saveOptions({ [key]: options[key].filter((_, idx) => idx !== i) })}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function ImagePromptBlock({ prompt }: { prompt: string }) {
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <ImageIcon className="size-4 text-muted-foreground" />
          Image Prompt
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className="border-t border-border/40 px-3 py-3 space-y-2">
          <p className="text-sm leading-relaxed text-muted-foreground">{prompt}</p>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleCopy}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy Prompt"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function SectionImagePromptsBlock({ prompts }: { prompts: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  function handleCopy(idx: number) {
    navigator.clipboard.writeText(prompts[idx]);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  function handleCopyAll() {
    navigator.clipboard.writeText(prompts.map((p, i) => `Section ${i + 1}: ${p}`).join("\n\n"));
    setCopiedIdx(-1);
    setTimeout(() => setCopiedIdx(null), 2000);
  }

  return (
    <div className="rounded-xl border border-border/40 bg-muted/20 overflow-hidden">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="flex items-center gap-2 font-medium text-foreground">
          <ImageIcon className="size-4 text-muted-foreground" />
          Section Images ({prompts.length})
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", expanded && "rotate-180")} />
      </button>
      {expanded ? (
        <div className="border-t border-border/40 px-3 py-3 space-y-3">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5"
            onClick={handleCopyAll}
          >
            {copiedIdx === -1 ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copiedIdx === -1 ? "Copied All" : "Copy All Prompts"}
          </Button>
          {prompts.map((p, i) => (
            <div key={i} className="space-y-1.5 rounded-lg border border-border/30 bg-background/50 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">Section {i + 1}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 px-2 text-xs text-muted-foreground"
                  onClick={() => handleCopy(i)}
                >
                  {copiedIdx === i ? <Check className="size-3" /> : <Copy className="size-3" />}
                  {copiedIdx === i ? "Copied" : "Copy"}
                </Button>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">{p}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function ResearchView() {
  const { addIdea } = useContentHub();
  const { options, loaded } = useCustomOptions();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  const [resultCount, setResultCount] = useState(3);
  const [generating, setGenerating] = useState(false);
  const [ideas, setIdeas] = useState<{ title: string; summary: string; signal: string; format: string; tags: string[]; imagePrompt?: string; sectionImagePrompts?: string[] }[]>([]);
  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [promptExpanded, setPromptExpanded] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [defaultPrompt, setDefaultPrompt] = useState("");
  const [isCustomPrompt, setIsCustomPrompt] = useState(false);
  const [savingPrompt, setSavingPrompt] = useState(false);
  const promptLoadedRef = useRef(false);

  useEffect(() => {
    if (promptLoadedRef.current) return;
    promptLoadedRef.current = true;
    fetch("/api/settings/research-prompt")
      .then((r) => r.json())
      .then((d) => {
        setSystemPrompt(d.prompt);
        setDefaultPrompt(d.defaultPrompt);
        setIsCustomPrompt(d.isCustom);
      })
      .catch(() => {});
  }, []);

  async function savePrompt() {
    setSavingPrompt(true);
    try {
      const res = await fetch("/api/settings/research-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: systemPrompt }),
      });
      const d = await res.json();
      if (d.prompt) {
        setSystemPrompt(d.prompt);
        setIsCustomPrompt(d.isCustom);
      }
    } finally {
      setSavingPrompt(false);
    }
  }

  function resetPrompt() {
    setSystemPrompt(defaultPrompt);
    setSavingPrompt(true);
    fetch("/api/settings/research-prompt", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: null }),
    })
      .then((r) => r.json())
      .then((d) => { setSystemPrompt(d.prompt); setIsCustomPrompt(false); })
      .finally(() => setSavingPrompt(false));
  }

  function toggleAudience(item: string) {
    setSelectedAudiences((prev) =>
      prev.includes(item) ? prev.filter((v) => v !== item) : [...prev, item],
    );
  }

  async function handleGenerate() {
    if (!selectedTopic || !selectedChannel || !selectedVoice || selectedAudiences.length === 0) return;

    setGenerating(true);
    setError(null);
    setIdeas([]);
    setAddedIndexes(new Set());

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic,
          channel: selectedChannel,
          voice: selectedVoice,
          audiences: selectedAudiences,
          context: additionalContext.trim() || undefined,
          count: resultCount,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || `Request failed (${res.status})`);
        return;
      }

      if (data.ideas?.length) {
        setIdeas(data.ideas);
      } else if (data.raw) {
        setError("Could not parse structured results. Try again.");
      } else {
        setError("No ideas returned. Try adjusting your parameters.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" /> Loading…
        </div>
      </div>
    );
  }

  const readyToGenerate = selectedTopic && selectedChannel && selectedVoice && selectedAudiences.length > 0;

  return (
    <div className="space-y-6">
      <Card className="border border-border/40 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="size-5" />
            AI Content Research
          </CardTitle>
          <CardDescription>
            Pick your focus, channel, voice, and audience — then generate research-backed content ideas.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3 text-sm leading-relaxed text-muted-foreground">
            <p className="font-medium text-foreground">How it works</p>
            <ul className="mt-1.5 space-y-1 list-none">
              <li><span className="font-medium text-foreground">1. Social signals</span> — scans for real demand: complaints, debates, and trending pain points across social platforms</li>
              <li><span className="font-medium text-foreground">2. Deep research</span> — cross-references with technical docs, competitor approaches, and what's actually shipping</li>
              <li><span className="font-medium text-foreground">3. Synthesis</span> — combines signal + substance into builder-focused angles tailored to your voice and audience</li>
            </ul>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Topic Focus</p>
            <div className="flex flex-wrap gap-2">
              {options.topics.map((topic) => (
                <Button
                  key={topic}
                  variant={selectedTopic === topic ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setSelectedTopic(selectedTopic === topic ? null : topic)}
                >
                  {topic}
                </Button>
              ))}
              {options.topics.length === 0 ? (
                <p className="text-sm text-muted-foreground">No topics configured. Add them in Settings.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Target Channel</p>
            <div className="flex flex-wrap gap-2">
              {options.channels.map((channel) => (
                <Button
                  key={channel}
                  variant={selectedChannel === channel ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setSelectedChannel(selectedChannel === channel ? null : channel)}
                >
                  {channel}
                </Button>
              ))}
              {options.channels.length === 0 ? (
                <p className="text-sm text-muted-foreground">No channels configured. Add them in Settings.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Brand Voice</p>
            <div className="flex flex-wrap gap-2">
              {options.voices.map((voice) => (
                <Button
                  key={voice}
                  variant={selectedVoice === voice ? "default" : "outline"}
                  className="h-10"
                  onClick={() => setSelectedVoice(selectedVoice === voice ? null : voice)}
                >
                  {voice}
                </Button>
              ))}
              {options.voices.length === 0 ? (
                <p className="text-sm text-muted-foreground">No voices configured. Add them in Settings.</p>
              ) : null}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Target Audience</p>
            <p className="text-xs text-muted-foreground">Select one or more.</p>
            <div className="flex flex-wrap gap-2">
              {options.audiences.map((audience) => (
                <Button
                  key={audience}
                  variant={selectedAudiences.includes(audience) ? "default" : "outline"}
                  className="h-10"
                  onClick={() => toggleAudience(audience)}
                >
                  {audience}
                </Button>
              ))}
              {options.audiences.length === 0 ? (
                <p className="text-sm text-muted-foreground">No audiences configured. Add them in Settings.</p>
              ) : null}
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium">Number of Results</p>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 5, 10].map((n) => (
                <Button
                  key={n}
                  variant={resultCount === n ? "default" : "outline"}
                  className="h-10 min-w-12"
                  onClick={() => setResultCount(n)}
                >
                  {n}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-medium">Additional Context <span className="font-normal text-muted-foreground">(optional)</span></p>
            <Textarea
              className="min-h-[5rem] resize-y text-base leading-7"
              placeholder="E.g. a specific angle, a recent event to reference, a URL to riff on…"
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border/40 pt-5">
          <Button
            className="h-12 w-full text-base"
            disabled={!readyToGenerate || generating}
            onClick={handleGenerate}
          >
            {generating ? <LoaderCircle className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            {generating ? "Generating…" : "Generate Research"}
          </Button>
        </CardFooter>
      </Card>

      {error ? (
        <Card className="border border-destructive/30 bg-destructive/5 backdrop-blur">
          <CardContent className="py-5">
            <p className="text-sm font-medium text-destructive">{error}</p>
          </CardContent>
        </Card>
      ) : null}

      {ideas.length > 0 ? (
        <div className="space-y-4">
          {ideas.map((idea, index) => {
            const added = addedIndexes.has(index);
            return (
              <Card key={index} className={cn("border border-border/40 bg-card/80 backdrop-blur transition", added && "opacity-60")}>
                <CardContent className="pt-5 pb-4 space-y-3">
                  <p className="text-lg font-semibold leading-7">{idea.title}</p>
                  <p className="text-base leading-7 text-muted-foreground">{idea.summary}</p>
                  <div className="rounded-lg border border-border/40 bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Signal:</span> {idea.signal}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="ring-1 ring-inset ring-border/40">{idea.format}</Badge>
                    {idea.tags?.map((tag) => (
                      <Badge key={tag} variant="outline" className="ring-1 ring-inset ring-border/40 text-muted-foreground">{tag}</Badge>
                    ))}
                  </div>
                  {idea.imagePrompt ? (
                    <ImagePromptBlock prompt={idea.imagePrompt} />
                  ) : null}
                  {idea.sectionImagePrompts && idea.sectionImagePrompts.length > 0 ? (
                    <SectionImagePromptsBlock prompts={idea.sectionImagePrompts} />
                  ) : null}
                </CardContent>
                <CardFooter className="border-t border-border/40 pt-4">
                  <Button
                    className="h-10 w-full"
                    variant={added ? "outline" : "default"}
                    disabled={added}
                    onClick={() => {
                      const allPrompts = [
                        idea.imagePrompt,
                        ...(idea.sectionImagePrompts ?? []),
                      ].filter(Boolean);
                      const combinedImagePrompt = allPrompts.length > 1
                        ? `Hero: ${allPrompts[0]}\n\n${allPrompts.slice(1).map((p, i) => `Section ${i + 1}: ${p}`).join("\n\n")}`
                        : allPrompts[0] || undefined;
                      addIdea({
                        title: idea.title,
                        description: `${idea.summary}\n\nSignal: ${idea.signal}\nFormat: ${idea.format}`,
                        imagePrompt: combinedImagePrompt,
                        platform: selectedChannel?.toLowerCase() === "substack" ? "substack" : selectedChannel?.toLowerCase() === "linkedin" ? "linkedin" : "both",
                        postType: "trenches",
                        priority: "medium",
                        status: "new",
                        tags: idea.tags ?? [],
                      });
                      setAddedIndexes((prev) => new Set(prev).add(index));
                    }}
                  >
                    {added ? (
                      <><Check className="size-4" /> Added to Ideas</>
                    ) : (
                      <><Plus className="size-4" /> Add to Ideas</>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      ) : null}

      <div className="rounded-xl border border-border/40 bg-card/80 backdrop-blur overflow-hidden">
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left text-sm"
          onClick={() => setPromptExpanded(!promptExpanded)}
        >
          <span className="flex items-center gap-2 font-medium">
            System Prompt
            {isCustomPrompt && (
              <Badge variant="outline" className="text-xs ring-1 ring-inset ring-border/40">Custom</Badge>
            )}
          </span>
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", promptExpanded && "rotate-180")} />
        </button>
        {promptExpanded && (
          <div className="border-t border-border/40 px-4 py-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              This prompt controls how research ideas are generated. Use placeholders: {"{{topic}}"}, {"{{channel}}"}, {"{{voice}}"}, {"{{audience}}"}, {"{{context}}"}, {"{{count}}"}.
            </p>
            <Textarea
              className="min-h-[16rem] resize-y font-mono text-sm leading-6"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                className="h-9"
                disabled={savingPrompt}
                onClick={savePrompt}
              >
                {savingPrompt ? <LoaderCircle className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-9"
                disabled={savingPrompt || !isCustomPrompt}
                onClick={resetPrompt}
              >
                Reset to Default
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export function ContentHubDashboard() {
  const { data, isReady } = useContentHub();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeTab, setActiveTabState] = useState<TabId>(() => parseTab(searchParams.get("tab")));
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const editingPost = editingPostId ? data.posts.find((p) => p.id === editingPostId) ?? null : null;

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
          "mx-auto flex-1 pt-4 pb-40 sm:pt-5 sm:pb-40",
          activeTab === "board" ? "max-w-[100rem] px-4 lg:px-8" : "max-w-3xl px-4",
        )}
      >
        {activeTab === "board" ? <BoardView onEditPost={setEditingPostId} /> : null}
        {activeTab === "calendar" ? <CalendarView /> : null}
        <div className={activeTab === "research" ? "" : "hidden"}>
          <ResearchView />
        </div>
        {activeTab === "settings" ? <SettingsView /> : null}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/40 bg-background/92 px-1 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1 backdrop-blur">
        <div className="mx-auto grid max-w-3xl grid-cols-4">
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

    {editingPost ? (
      <DraftEditorOverlay
        post={editingPost}
        onClose={() => setEditingPostId(null)}
      />
    ) : null}
    </ImageViewerProvider>
  );
}
