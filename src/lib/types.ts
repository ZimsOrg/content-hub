export type TabId =
  | "board"
  | "calendar"
  | "research"
  | "settings";

export type Platform = "linkedin" | "substack" | "both";

export type PostPlatform = Exclude<Platform, "both">;

export type PostType =
  | "trenches"
  | "contrarian"
  | "tool-review"
  | "free-roundup"
  | "paid-deep-dive";

export type IdeaPriority = "high" | "medium" | "low";
export type IdeaStatus = "new" | "developing" | "ready";
export type PostStatus = "idea" | "draft" | "approved" | "posted";
export type ApprovalStatus =
  | "pending"
  | "approved"
  | "rejected"
  | "needs-revision";
export type ThemePreference = "light" | "dark" | "system";

export interface Idea {
  id: string;
  title: string;
  description?: string;
  platform: Platform;
  postType: PostType;
  priority: IdeaPriority;
  status: IdeaStatus;
  tags?: string[];
  imagePrompt?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
  scheduledPostIds?: string[];
}

export interface Comment {
  id: string;
  text: string;
  author: "edo" | "zima";
  createdAt: string;
}

export interface Revision {
  id: string;
  content: string;
  createdAt: string;
}

export interface PostMetrics {
  impressions?: number;
  comments?: number;
  reposts?: number;
  reactions?: number;
  followerDelta?: number;
}

export interface Post {
  id: string;
  ideaId?: string;
  title: string;
  content: string;
  imageUrl?: string;
  platform: PostPlatform;
  postType: PostType;
  scheduledAt: string;
  status: PostStatus;
  approvalStatus?: ApprovalStatus;
  comments: Comment[];
  revisions: Revision[];
  metrics?: PostMetrics;
  imagePrompt?: string;
  archived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AnalyticsEntry {
  date: string;
  linkedinFollowers?: number;
  substackSubscribers?: number;
}

export interface Settings {
  theme: ThemePreference;
  postingSchedule: {
    linkedin: number[];
    substack: number[];
  };
  notificationsEnabled: boolean;
}

export interface ContentHubData {
  ideas: Idea[];
  posts: Post[];
  analytics: AnalyticsEntry[];
  settings: Settings;
}

export interface CustomOptions {
  topics: string[];
  channels: string[];
  voices: string[];
  audiences: string[];
}

export interface ApiKeyEntry {
  provider: string;
  label: string;
  hasKey: boolean;
}

export interface ResearchConfig {
  topicSeeds: string[];
  defaultModel: string;
  searchModel: string;
  imageModel: string;
}
