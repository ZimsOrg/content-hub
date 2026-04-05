"use client";

import { useEffect, useMemo, useState, useTransition, type ChangeEvent } from "react";
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
  ChevronLeft,
  ChevronRight,
  Circle,
  Clock3,
  FilePenLine,
  FileText,
  Flame,
  Lightbulb,
  Link2,
  LoaderCircle,
  Menu,
  MessageSquareText,
  Moon,
  PanelLeft,
  PencilLine,
  Plus,
  Search,
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
import { Calendar } from "@/components/ui/calendar";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

const POST_TYPE_META: Record<
  PostType,
  { label: string; dot: string; badge: string }
> = {
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
    border: "border-l-4 border-l-rose-500",
    badge: "bg-rose-500/12 text-rose-700 ring-rose-500/20 dark:text-rose-300",
  },
  medium: {
    label: "Medium",
    border: "border-l-4 border-l-amber-500",
    badge: "bg-amber-500/12 text-amber-700 ring-amber-500/20 dark:text-amber-300",
  },
  low: {
    label: "Low",
    border: "border-l-4 border-l-emerald-500",
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

function safeNumber(value: number | undefined) {
  return value ?? 0;
}

function postMatchesDate(post: Post, date: Date) {
  return isSameDay(parseISO(post.scheduledAt), date);
}

function sortPostsByDate(posts: Post[]) {
  return [...posts].sort(
    (left, right) =>
      parseISO(left.scheduledAt).getTime() - parseISO(right.scheduledAt).getTime(),
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
    <Card className="min-w-[14rem] border border-border/60 bg-card/80 backdrop-blur">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardDescription>{label}</CardDescription>
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tracking-tight">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
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
    <Badge className="ring-1 ring-inset ring-border/60" variant="outline">
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
    <Card className="border border-dashed border-border/70 bg-card/60">
      <CardContent className="flex flex-col items-center gap-3 px-6 py-10 text-center">
        <div className="rounded-full bg-muted p-3">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">{title}</p>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
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
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add To Calendar</DialogTitle>
          <DialogDescription>
            Schedule this idea as a draft and attach it to the main calendar.
          </DialogDescription>
        </DialogHeader>
        {idea ? (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/70 bg-muted/30 p-4">
              <p className="font-medium">{idea.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{idea.description}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Publish date</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="w-full rounded-2xl border border-border/70"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Time</label>
                <Input
                  className="h-11"
                  type="time"
                  value={selectedTime}
                  onChange={(event) => setSelectedTime(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Platform</label>
                <Select
                  value={selectedPlatform}
                  onValueChange={(value) => setSelectedPlatform(value as PostPlatform)}
                >
                  <SelectTrigger className="h-11 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availablePlatforms.map((platform) => (
                      <SelectItem key={platform} value={platform}>
                        {PLATFORM_META[platform].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={handleSchedule}>
            <Send />
            Schedule draft
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
      addComment(post.id, comment, "zima");
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {mode === "edit" ? (
          <Textarea
            className="min-h-72"
            value={content}
            onChange={(event) => setContent(event.target.value)}
          />
        ) : (
          <Textarea
            className="min-h-36"
            placeholder={
              config?.requireComment
                ? "Explain the rejection or revision request"
                : "Leave a note for the draft thread"
            }
            value={comment}
            onChange={(event) => setComment(event.target.value)}
          />
        )}
        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          <Button
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CalendarView() {
  const { data } = useContentHub();
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [createOpen, setCreateOpen] = useState(false);

  const monthStart = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const monthEnd = addDays(startOfWeek(endOfMonth(month), { weekStartsOn: 0 }), 6);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const agenda = sortPostsByDate(data.posts.filter((post) => postMatchesDate(post, selectedDate)));
  const weekStrip = Array.from({ length: 7 }, (_, index) =>
    addDays(startOfWeek(selectedDate, { weekStartsOn: 0 }), index),
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <Card className="border border-border/70 bg-card/80 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.45)] backdrop-blur">
          <CardHeader className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle className="text-xl">{format(month, "MMMM yyyy")}</CardTitle>
                <CardDescription>
                  Click any day to inspect the posting agenda and cadence.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
                  <ChevronLeft />
                </Button>
                <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
                  <ChevronRight />
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2 md:hidden">
              {weekStrip.map((date) => {
                const posts = data.posts.filter((post) => postMatchesDate(post, date));
                return (
                  <button
                    key={date.toISOString()}
                    className={cn(
                      "min-h-16 rounded-2xl border px-2 py-2 text-left transition",
                      isSameDay(date, selectedDate)
                        ? "border-foreground/20 bg-foreground/5"
                        : "border-border/70 bg-background/60",
                    )}
                    onClick={() => setSelectedDate(date)}
                    type="button"
                  >
                    <div className="text-xs text-muted-foreground">{format(date, "EEE")}</div>
                    <div className="mt-1 text-base font-medium">{format(date, "d")}</div>
                    <div className="mt-2 flex gap-1">
                      {posts.slice(0, 3).map((post) => (
                        <span
                          key={post.id}
                          className="size-2 rounded-full"
                          style={{ backgroundColor: getPlatformColor(post.platform) }}
                        />
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardHeader>
          <CardContent>
            <div className="hidden grid-cols-7 gap-2 pb-3 text-xs uppercase tracking-[0.2em] text-muted-foreground md:grid">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                <div key={day} className="px-3">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {days.map((date) => {
                const posts = sortPostsByDate(data.posts.filter((post) => postMatchesDate(post, date)));
                const isActive = isSameDay(date, selectedDate);

                return (
                  <button
                    key={date.toISOString()}
                    className={cn(
                      "hidden min-h-28 rounded-3xl border p-3 text-left transition md:block",
                      isActive
                        ? "border-foreground/15 bg-foreground/[0.045] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
                        : "border-border/70 bg-background/75 hover:bg-muted/40",
                      !isSameMonth(date, month) && "opacity-45",
                    )}
                    onClick={() => setSelectedDate(date)}
                    type="button"
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full text-sm",
                          isToday(date) && "bg-foreground text-background",
                        )}
                      >
                        {format(date, "d")}
                      </span>
                      <div className="flex gap-1">
                        {posts.slice(0, 2).map((post) => (
                          <span
                            key={post.id}
                            className="size-2 rounded-full"
                            style={{ backgroundColor: getPlatformColor(post.platform) }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="mt-4 space-y-1.5">
                      {posts.slice(0, 2).map((post) => (
                        <div
                          key={post.id}
                          className="truncate rounded-xl px-2 py-1 text-xs text-foreground"
                          style={{
                            backgroundColor: `${getPlatformColor(post.platform)}18`,
                          }}
                        >
                          {post.title}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <div className="md:hidden">
          <Button className="fixed right-5 bottom-24 z-40 size-14 rounded-full shadow-xl" size="icon-lg">
            <Plus />
          </Button>
        </div>
      </div>

      <Card className="border border-border/70 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{formatDayLabel(selectedDate)}</span>
            <Badge variant="outline" className="ring-1 ring-inset ring-border/60">
              {agenda.length} scheduled
            </Badge>
          </CardTitle>
          <CardDescription>Agenda view for the selected day.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {agenda.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No scheduled content"
              description="Choose another day or add an idea from the Ideas tab."
            />
          ) : (
            agenda.map((post) => (
              <Card key={post.id} size="sm" className="border border-border/70 bg-background/70">
                <CardHeader className="pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap gap-2">
                        <PlatformBadge platform={post.platform} />
                        <PostTypeBadge postType={post.postType} />
                        <StatusBadge value={post.status} />
                      </div>
                      <CardTitle>{post.title}</CardTitle>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock3 className="size-3.5" />
                      {format(parseISO(post.scheduledAt), "p")}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="line-clamp-4 text-sm text-muted-foreground">{post.content}</p>
                </CardContent>
              </Card>
            ))
          )}
        </CardContent>
        <CardFooter className="justify-between">
          <span className="text-xs text-muted-foreground">
            Blue dots are LinkedIn. Orange dots are Substack.
          </span>
          <Button variant="outline" onClick={() => setCreateOpen(true)}>
            <Plus />
            Quick add
          </Button>
        </CardFooter>
      </Card>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Quick Add</DialogTitle>
            <DialogDescription>
              Capture new scheduled items from the Ideas tab where the full creation flow is available.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setCreateOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IdeasView() {
  const { data } = useContentHub();
  const [query, setQuery] = useState("");
  const [selectedIdea, setSelectedIdea] = useState<Idea | null>(null);

  const ideas = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return sortIdeasByPriority(
      data.ideas.filter((idea) => {
        if (!normalizedQuery) {
          return true;
        }

        return [idea.title, idea.description, idea.tags?.join(" ")]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);
      }),
    );
  }, [data.ideas, query]);

  return (
    <div className="space-y-5">
      <Card className="border border-border/70 bg-card/80 backdrop-blur">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <CardTitle className="text-xl">Ideas Bank</CardTitle>
              <CardDescription>
                Search, sort, and push promising ideas onto the content calendar.
              </CardDescription>
            </div>
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-11 rounded-2xl pl-10"
                placeholder="Search ideas, tags, or notes"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-4">
        {ideas.length === 0 ? (
          <EmptyState
            icon={Lightbulb}
            title="No matching ideas"
            description="Adjust the search terms to surface more of the backlog."
          />
        ) : (
          ideas.map((idea) => (
            <Card
              key={idea.id}
              className={cn(
                "border border-border/70 bg-card/80 backdrop-blur",
                PRIORITY_META[idea.priority].border,
              )}
            >
              <CardHeader>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <Badge
                        className={cn("ring-1 ring-inset", PRIORITY_META[idea.priority].badge)}
                        variant="outline"
                      >
                        {PRIORITY_META[idea.priority].label}
                      </Badge>
                      <PlatformBadge platform={idea.platform} />
                      <PostTypeBadge postType={idea.postType} />
                      <StatusBadge value={idea.status} />
                    </div>
                    <div>
                      <CardTitle>{idea.title}</CardTitle>
                      <CardDescription className="mt-2 max-w-3xl leading-6">
                        {idea.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button className="h-11 px-4" onClick={() => setSelectedIdea(idea)}>
                    <Plus />
                    Add to Calendar
                  </Button>
                </div>
              </CardHeader>
              <CardFooter className="flex flex-wrap justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {(idea.tags ?? []).map((tag) => (
                    <Badge key={tag} variant="outline" className="ring-1 ring-inset ring-border/60">
                      <Link2 />
                      {tag}
                    </Badge>
                  ))}
                </div>
                <span className="text-xs text-muted-foreground">
                  Updated {format(parseISO(idea.updatedAt), "MMM d, yyyy")}
                </span>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

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
  const { data } = useContentHub();
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<"edit" | "comment" | ApprovalStatus | null>(null);

  const drafts = sortPostsByDate(
    data.posts.filter((post) => post.status !== "posted" || post.approvalStatus !== "approved"),
  );
  const activePost = drafts.find((post) => post.id === activePostId) ?? null;

  function openDialog(postId: string, mode: "edit" | "comment" | ApprovalStatus) {
    setActivePostId(postId);
    setDialogMode(mode);
  }

  return (
    <div className="space-y-4">
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
            <Card key={post.id} className="border border-border/70 bg-card/80 backdrop-blur">
              <CardHeader>
                <button
                  className="flex w-full items-start justify-between gap-4 text-left"
                  onClick={() => setActivePostId(expanded ? null : post.id)}
                  type="button"
                >
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      <PlatformBadge platform={post.platform} />
                      <PostTypeBadge postType={post.postType} />
                      <StatusBadge value={post.status} />
                      {post.approvalStatus ? <StatusBadge value={post.approvalStatus} /> : null}
                    </div>
                    <div>
                      <CardTitle>{post.title}</CardTitle>
                      <CardDescription className="mt-2 flex flex-wrap items-center gap-3">
                        <span>{format(parseISO(post.scheduledAt), "EEE, MMM d 'at' p")}</span>
                        <span>{post.comments.length} comments</span>
                        <span>{post.revisions.length} revisions</span>
                      </CardDescription>
                    </div>
                  </div>
                  <ChevronRight className={cn("mt-1 size-5 transition", expanded && "rotate-90")} />
                </button>
              </CardHeader>
              {expanded ? (
                <>
                  <CardContent className="space-y-5">
                    <div className="rounded-2xl border border-border/70 bg-background/80 p-4">
                      <pre className="font-sans whitespace-pre-wrap text-sm leading-6 text-foreground">
                        {post.content}
                      </pre>
                    </div>
                    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_18rem]">
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Feedback thread</p>
                        {post.comments.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No comments yet.</p>
                        ) : (
                          post.comments.map((comment) => (
                            <div
                              key={comment.id}
                              className="rounded-2xl border border-border/70 bg-muted/30 p-3"
                            >
                              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                                <span>{comment.author}</span>
                                <span>{format(parseISO(comment.createdAt), "MMM d, p")}</span>
                              </div>
                              <p className="mt-2 text-sm leading-6">{comment.text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="space-y-3">
                        <p className="text-sm font-medium">Revision history</p>
                        {post.revisions.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No saved revisions yet.</p>
                        ) : (
                          post.revisions.map((revision) => (
                            <div
                              key={revision.id}
                              className="rounded-2xl border border-border/70 bg-muted/30 p-3"
                            >
                              <div className="text-xs text-muted-foreground">
                                {format(parseISO(revision.createdAt), "MMM d, yyyy 'at' p")}
                              </div>
                              <p className="mt-2 line-clamp-4 text-sm text-muted-foreground">
                                {revision.content}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex flex-wrap gap-2">
                    <Button onClick={() => openDialog(post.id, "approved")}>
                      <Check />
                      Approve
                    </Button>
                    <Button variant="outline" onClick={() => openDialog(post.id, "edit")}>
                      <PencilLine />
                      Edit
                    </Button>
                    <Button variant="outline" onClick={() => openDialog(post.id, "comment")}>
                      <MessageSquareText />
                      Comment
                    </Button>
                    <Button variant="destructive" onClick={() => openDialog(post.id, "rejected")}>
                      <X />
                      Reject
                    </Button>
                  </CardFooter>
                </>
              ) : null}
            </Card>
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
  const totalImpressions = posted.reduce(
    (sum, post) => sum + safeNumber(post.metrics?.impressions),
    0,
  );
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
    <div className="space-y-6">
      <div className="flex gap-4 overflow-x-auto pb-1">
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
          value={bestPost ? bestPost.title.slice(0, 18) + (bestPost.title.length > 18 ? "…" : "") : "N/A"}
          hint={bestPost ? `${safeNumber(bestPost.metrics?.impressions).toLocaleString()} impressions` : "No published posts"}
          icon={Flame}
        />
        <StatCard
          label="Total Comments"
          value={totalComments.toLocaleString()}
          hint="Signals audience conversation"
          icon={MessageSquareText}
        />
      </div>

      <Card className="border border-border/70 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Impressions Over Time</CardTitle>
          <CardDescription>
            LinkedIn and Substack growth trajectories from the manual analytics log.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
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
        </CardContent>
      </Card>

      <Card className="border border-border/70 bg-card/80 backdrop-blur">
        <CardHeader>
          <CardTitle>Top Posts</CardTitle>
          <CardDescription>Sorted by impressions, with manual entry for missing metrics.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {sortedByImpressions.map((post) => (
            <div
              key={post.id}
              className="grid gap-3 rounded-2xl border border-border/70 bg-background/60 p-4 lg:grid-cols-[minmax(0,1fr)_120px_100px_100px_140px]"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <PlatformBadge platform={post.platform} />
                  <PostTypeBadge postType={post.postType} />
                </div>
                <p className="font-medium">{post.title}</p>
                <p className="text-xs text-muted-foreground">
                  {format(parseISO(post.scheduledAt), "MMM d, yyyy")}
                </p>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Impressions</div>
                <div className="text-lg font-semibold">
                  {safeNumber(post.metrics?.impressions).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Comments</div>
                <div className="text-lg font-semibold">
                  {safeNumber(post.metrics?.comments).toLocaleString()}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Reposts</div>
                <div className="text-lg font-semibold">
                  {safeNumber(post.metrics?.reposts).toLocaleString()}
                </div>
              </div>
              <div className="flex items-center lg:justify-end">
                <Button variant="outline" onClick={() => openMetrics(post.id)}>
                  <PencilLine />
                  Enter metrics
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selectedPost)} onOpenChange={(open) => !open && setSelectedPostId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Update Metrics</DialogTitle>
            <DialogDescription>
              Manual entry for published performance stats.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ["impressions", "Impressions"],
                ["comments", "Comments"],
                ["reposts", "Reposts"],
                ["reactions", "Reactions"],
                ["followerDelta", "Follower Delta"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <label className="text-sm font-medium">{label}</label>
                <Input
                  className="h-11"
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
            <Button variant="outline" onClick={() => setSelectedPostId(null)}>
              Cancel
            </Button>
            <Button onClick={submitMetrics}>
              <Check />
              Save metrics
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
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-5">
        <Card className="border border-border/70 bg-card/80 backdrop-blur">
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

        <Card className="border border-border/70 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Data Controls</CardTitle>
            <CardDescription>Export the full local store or restore it from JSON.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button className="h-11 px-4" onClick={handleExport}>
              <ArrowDownToLine />
              Export JSON
            </Button>
            <label className="inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 text-sm font-medium hover:bg-muted">
              <ArrowUpFromLine className="size-4" />
              Import JSON
              <input
                accept="application/json"
                className="sr-only"
                type="file"
                onChange={handleImport}
              />
            </label>
            {isPending ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <LoaderCircle className="size-4 animate-spin" />
                Importing
              </div>
            ) : null}
          </CardContent>
          {importError ? (
            <CardFooter>
              <p className="text-sm text-destructive">{importError}</p>
            </CardFooter>
          ) : null}
        </Card>

        <Card className="border border-border/70 bg-card/80 backdrop-blur">
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

      <div className="space-y-5">
        <Card className="border border-border/70 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
            <CardDescription>Stored for future reminder workflows.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant={data.settings.notificationsEnabled ? "default" : "outline"}
              className="h-11 px-4"
              onClick={() => setNotificationsEnabled(!data.settings.notificationsEnabled)}
            >
              <Bell />
              {data.settings.notificationsEnabled ? "Enabled" : "Disabled"}
            </Button>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-card/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Strategy Notes</CardTitle>
            <CardDescription>Reference snapshot for the current publishing system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>LinkedIn runs three times per week with sharper, shorter narrative posts.</p>
            <p>Substack alternates between free roundups and premium deep dives.</p>
            <p>Use the Drafts tab to capture reasons behind approval and rejection decisions.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export function ContentHubDashboard() {
  const { data, isReady } = useContentHub();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const activeTab = parseTab(searchParams.get("tab"));
  const todayPosts = data.posts.filter((post) => postMatchesDate(post, new Date())).length;
  const pendingReviews = data.posts.filter(
    (post) => post.approvalStatus === "pending" || post.approvalStatus === "needs-revision",
  ).length;

  function setActiveTab(nextTab: TabId) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "calendar") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }

    router.replace(params.size ? `${pathname}?${params.toString()}` : pathname, {
      scroll: false,
    });
    setMobileNavOpen(false);
  }

  if (!isReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex items-center gap-3 rounded-full border border-border/70 bg-card/80 px-5 py-3 text-sm text-muted-foreground">
          <LoaderCircle className="size-4 animate-spin" />
          Loading content hub
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(0,119,181,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,103,25,0.12),transparent_22%),linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,255,255,0.92))] text-foreground dark:bg-[radial-gradient(circle_at_top_left,rgba(0,119,181,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,103,25,0.16),transparent_20%),linear-gradient(180deg,rgba(9,9,11,1),rgba(12,12,14,1))]">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <aside className="hidden w-72 shrink-0 border-r border-border/60 bg-sidebar/70 px-5 py-6 backdrop-blur xl:flex xl:flex-col">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.24em] text-muted-foreground">
              <Sparkles className="size-3.5" />
              Content Hub
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">Creator operating system</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Mobile-first publishing, review, and analytics across LinkedIn and Substack.
              </p>
            </div>
          </div>

          <nav className="mt-8 space-y-2">
            {TAB_ITEMS.map((item) => {
              const Icon = item.icon;
              const active = item.id === activeTab;
              return (
                <button
                  key={item.id}
                  className={cn(
                    "flex min-h-11 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition",
                    active
                      ? "bg-foreground text-background shadow-lg"
                      : "bg-transparent text-muted-foreground hover:bg-background/70 hover:text-foreground",
                  )}
                  onClick={() => setActiveTab(item.id)}
                  type="button"
                >
                  <Icon className="size-4" />
                  <div>
                    <div className="font-medium">{item.label}</div>
                    <div className={cn("text-xs", active ? "text-background/70" : "text-muted-foreground")}>
                      {item.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>

          <div className="mt-auto grid gap-3">
            <Card size="sm" className="border border-border/70 bg-background/60">
              <CardHeader>
                <CardDescription>Today</CardDescription>
                <CardTitle>{todayPosts} scheduled items</CardTitle>
              </CardHeader>
            </Card>
            <Card size="sm" className="border border-border/70 bg-background/60">
              <CardHeader>
                <CardDescription>Review Queue</CardDescription>
                <CardTitle>{pendingReviews} drafts need attention</CardTitle>
              </CardHeader>
            </Card>
          </div>
        </aside>

        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 border-b border-border/60 bg-background/75 backdrop-blur">
            <div className="flex min-h-18 items-center justify-between gap-3 px-4 py-3 sm:px-6 lg:px-8">
              <div className="flex items-center gap-3">
                <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
                  <SheetTrigger
                    render={
                      <Button
                        variant="outline"
                        size="icon"
                        className="xl:hidden"
                        aria-label="Open navigation"
                      />
                    }
                  >
                    <Menu />
                  </SheetTrigger>
                  <SheetContent side="left" className="w-[88vw] max-w-sm border-r border-border/70">
                    <SheetHeader>
                      <SheetTitle>Content Hub</SheetTitle>
                      <SheetDescription>Navigate between the five dashboard views.</SheetDescription>
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
                                : "border border-border/70 bg-background text-foreground",
                            )}
                            onClick={() => setActiveTab(item.id)}
                            type="button"
                          >
                            <Icon className="size-4" />
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </SheetContent>
                </Sheet>
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                    {format(new Date(), "EEEE, MMMM d")}
                  </div>
                  <h2 className="text-lg font-semibold tracking-tight sm:text-2xl">
                    {TAB_ITEMS.find((item) => item.id === activeTab)?.label}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline" size="icon" aria-label="Pending reviews" />}
                  >
                    <FilePenLine />
                  </TooltipTrigger>
                  <TooltipContent>{pendingReviews} pending review items</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger
                    render={<Button variant="outline" size="icon" aria-label="Theme status" />}
                  >
                    {data.settings.theme === "dark" ? <Moon /> : data.settings.theme === "light" ? <Sun /> : <PanelLeft />}
                  </TooltipTrigger>
                  <TooltipContent>Theme: {data.settings.theme}</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-5 pb-24 sm:px-6 lg:px-8 lg:py-8 xl:pb-8">
            <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
              <Card className="border border-border/70 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardDescription>Operating Summary</CardDescription>
                  <CardTitle className="text-2xl">
                    {data.posts.length} posts, {data.ideas.length} ideas, {pendingReviews} reviews in motion
                  </CardTitle>
                </CardHeader>
              </Card>
              <Card className="border border-border/70 bg-card/80 backdrop-blur">
                <CardHeader>
                  <CardDescription>Posting Targets</CardDescription>
                  <CardTitle className="text-base">
                    LinkedIn {data.settings.postingSchedule.linkedin.length} days/week, Substack{" "}
                    {data.settings.postingSchedule.substack.length} days/week
                  </CardTitle>
                </CardHeader>
              </Card>
            </section>

            {activeTab === "calendar" ? <CalendarView /> : null}
            {activeTab === "ideas" ? <IdeasView /> : null}
            {activeTab === "drafts" ? <DraftsView /> : null}
            {activeTab === "analytics" ? <AnalyticsView /> : null}
            {activeTab === "settings" ? <SettingsView /> : null}
          </main>
        </div>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-border/70 bg-background/92 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur xl:hidden">
        <div className="grid grid-cols-5 gap-1">
          {TAB_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                className={cn(
                  "flex min-h-11 flex-col items-center justify-center rounded-2xl px-1 py-2 text-[11px] font-medium transition",
                  active ? "bg-foreground text-background" : "text-muted-foreground",
                )}
                onClick={() => setActiveTab(item.id)}
                type="button"
              >
                <Icon className="mb-1 size-4" />
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
