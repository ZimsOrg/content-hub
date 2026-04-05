"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";

import { seedContentHubData } from "@/lib/seed-data";
import type {
  Comment,
  ContentHubData,
  Idea,
  Post,
  PostMetrics,
  PostPlatform,
  PostStatus,
  PostType,
  ThemePreference,
} from "@/lib/types";

const STORAGE_KEY = "content-hub-dashboard-v1";

type NewIdeaInput = Pick<
  Idea,
  "title" | "description" | "platform" | "postType" | "priority" | "status" | "tags"
>;

type NewPostInput = {
  ideaId?: string;
  title: string;
  content: string;
  platform: PostPlatform;
  postType: PostType;
  scheduledAt: string;
  status: PostStatus;
};

type ScheduleIdeaInput = {
  ideaId: string;
  title: string;
  content: string;
  scheduledAt: string;
  platform: PostPlatform;
};

type ContentHubContextValue = {
  data: ContentHubData;
  isReady: boolean;
  addIdea: (input: NewIdeaInput) => void;
  updateIdea: (ideaId: string, patch: Partial<Idea>) => void;
  deleteIdea: (ideaId: string) => void;
  addPost: (input: NewPostInput) => void;
  updatePost: (postId: string, patch: Partial<Post>) => void;
  scheduleIdea: (input: ScheduleIdeaInput) => void;
  addComment: (postId: string, text: string, author?: Comment["author"]) => void;
  setApprovalStatus: (
    postId: string,
    approvalStatus: Post["approvalStatus"],
    comment?: string,
  ) => void;
  savePostContent: (postId: string, content: string) => void;
  saveMetrics: (postId: string, metrics: PostMetrics) => void;
  setTheme: (theme: ThemePreference) => void;
  setPostingSchedule: (platform: PostPlatform, days: number[]) => void;
  setNotificationsEnabled: (enabled: boolean) => void;
  importData: (nextData: ContentHubData) => void;
  exportData: () => string;
};

const ContentHubContext = createContext<ContentHubContextValue | null>(null);

function getDefaultData(): ContentHubData {
  return structuredClone(seedContentHubData);
}

function parseStoredData(value: string | null): ContentHubData {
  if (!value) {
    return getDefaultData();
  }

  try {
    const parsed = JSON.parse(value) as ContentHubData;
    return {
      ...getDefaultData(),
      ...parsed,
      settings: {
        ...getDefaultData().settings,
        ...parsed.settings,
      },
    };
  } catch {
    return getDefaultData();
  }
}

function applyTheme(theme: ThemePreference) {
  const root = document.documentElement;
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const resolvedTheme = theme === "system" ? (prefersDark ? "dark" : "light") : theme;

  root.classList.toggle("dark", resolvedTheme === "dark");
  root.style.colorScheme = resolvedTheme;
}

export function ContentHubProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<ContentHubData>(getDefaultData);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const nextData = parseStoredData(window.localStorage.getItem(STORAGE_KEY));
    setData(nextData);
    applyTheme(nextData.settings.theme);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    applyTheme(data.settings.theme);
  }, [data, isReady]);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = () => {
      if (data.settings.theme === "system") {
        applyTheme("system");
      }
    };

    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [data.settings.theme, isReady]);

  const value = useMemo<ContentHubContextValue>(() => {
    return {
      data,
      isReady,
      addIdea: (input) => {
        const timestamp = new Date().toISOString();
        const idea: Idea = {
          id: uuidv4(),
          title: input.title,
          description: input.description,
          platform: input.platform,
          postType: input.postType,
          priority: input.priority,
          status: input.status,
          tags: input.tags?.filter(Boolean),
          createdAt: timestamp,
          updatedAt: timestamp,
          scheduledPostIds: [],
        };

        setData((current) => ({ ...current, ideas: [idea, ...current.ideas] }));
      },
      updateIdea: (ideaId, patch) => {
        setData((current) => ({
          ...current,
          ideas: current.ideas.map((idea) =>
            idea.id === ideaId ? { ...idea, ...patch, updatedAt: new Date().toISOString() } : idea,
          ),
        }));
      },
      deleteIdea: (ideaId) => {
        setData((current) => ({
          ...current,
          ideas: current.ideas.filter((idea) => idea.id !== ideaId),
        }));
      },
      addPost: (input) => {
        const timestamp = new Date().toISOString();
        const post: Post = {
          id: uuidv4(),
          ideaId: input.ideaId,
          title: input.title,
          content: input.content,
          platform: input.platform,
          postType: input.postType,
          scheduledAt: input.scheduledAt,
          status: input.status,
          approvalStatus:
            input.status === "approved"
              ? "approved"
              : input.status === "posted"
                ? "approved"
                : "pending",
          comments: [],
          revisions: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        setData((current) => ({
          ...current,
          posts: [...current.posts, post],
        }));
      },
      updatePost: (postId, patch) => {
        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId ? { ...post, ...patch, updatedAt: new Date().toISOString() } : post,
          ),
        }));
      },
      scheduleIdea: ({ ideaId, title, content, scheduledAt, platform }) => {
        const timestamp = new Date().toISOString();
        const matchingIdea = data.ideas.find((idea) => idea.id === ideaId);
        if (!matchingIdea) {
          return;
        }

        const postId = uuidv4();
        const post: Post = {
          id: postId,
          ideaId,
          title,
          content,
          platform,
          postType: matchingIdea.postType,
          scheduledAt,
          status: "draft",
          approvalStatus: "pending",
          comments: [],
          revisions: [],
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        setData((current) => ({
          ...current,
          posts: [...current.posts, post],
          ideas: current.ideas.map((idea) =>
            idea.id === ideaId
              ? {
                  ...idea,
                  status: "ready",
                  scheduledPostIds: [...(idea.scheduledPostIds ?? []), postId],
                  updatedAt: timestamp,
                }
              : idea,
          ),
        }));
      },
      addComment: (postId, text, author = "zima") => {
        if (!text.trim()) {
          return;
        }

        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: [
                    ...post.comments,
                    { id: uuidv4(), text: text.trim(), author, createdAt: new Date().toISOString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : post,
          ),
        }));
      },
      setApprovalStatus: (postId, approvalStatus, comment) => {
        setData((current) => ({
          ...current,
          posts: current.posts.map((post) => {
            if (post.id !== postId) {
              return post;
            }

            const nextComments = comment?.trim()
              ? [
                  ...post.comments,
                  {
                    id: uuidv4(),
                    text: comment.trim(),
                    author: "zima" as const,
                    createdAt: new Date().toISOString(),
                  },
                ]
              : post.comments;

            return {
              ...post,
              approvalStatus,
              status:
                approvalStatus === "approved"
                  ? "approved"
                  : approvalStatus === "needs-revision" || approvalStatus === "rejected"
                    ? "review"
                    : post.status,
              comments: nextComments,
              updatedAt: new Date().toISOString(),
            };
          }),
        }));
      },
      savePostContent: (postId, content) => {
        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  content,
                  revisions: [
                    ...post.revisions,
                    { id: uuidv4(), content: post.content, createdAt: new Date().toISOString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : post,
          ),
        }));
      },
      saveMetrics: (postId, metrics) => {
        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  status: "posted",
                  approvalStatus: "approved",
                  metrics,
                  updatedAt: new Date().toISOString(),
                }
              : post,
          ),
        }));
      },
      setTheme: (theme) => {
        setData((current) => ({
          ...current,
          settings: { ...current.settings, theme },
        }));
      },
      setPostingSchedule: (platform, days) => {
        setData((current) => ({
          ...current,
          settings: {
            ...current.settings,
            postingSchedule: {
              ...current.settings.postingSchedule,
              [platform]: days,
            },
          },
        }));
      },
      setNotificationsEnabled: (enabled) => {
        setData((current) => ({
          ...current,
          settings: {
            ...current.settings,
            notificationsEnabled: enabled,
          },
        }));
      },
      importData: (nextData) => {
        setData(nextData);
      },
      exportData: () => JSON.stringify(data, null, 2),
    };
  }, [data, isReady]);

  return <ContentHubContext.Provider value={value}>{children}</ContentHubContext.Provider>;
}

export function useContentHub() {
  const context = useContext(ContentHubContext);
  if (!context) {
    throw new Error("useContentHub must be used within ContentHubProvider");
  }

  return context;
}
