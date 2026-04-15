"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { v4 as uuidv4 } from "uuid";

import { getApprovalStatusForPostStatus, resolveApprovalStatus } from "@/lib/post-approval";
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

type NewIdeaInput = Pick<
  Idea,
  "title" | "description" | "platform" | "postType" | "priority" | "status" | "tags" | "imagePrompt"
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
  setIdeaStatus: (ideaId: string, status: Idea["status"]) => Promise<void>;
  deleteIdea: (ideaId: string) => void;
  archiveIdea: (ideaId: string) => void;
  unarchiveIdea: (ideaId: string) => void;
  deletePost: (postId: string) => void;
  addPost: (input: NewPostInput) => void;
  updatePost: (postId: string, patch: Partial<Post>) => void;
  setPostStatus: (postId: string, status: PostStatus) => Promise<void>;
  archivePost: (postId: string) => void;
  unarchivePost: (postId: string) => void;
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

function normalizeData(value: ContentHubData): ContentHubData {
  const defaultData = getDefaultData();
  const rawPosts = value.posts ?? defaultData.posts;

  return {
    ...defaultData,
    ...value,
    posts: rawPosts.map((post) => ({
      ...post,
      approvalStatus: resolveApprovalStatus(post.status, post.approvalStatus),
    })),
    settings: {
      ...defaultData.settings,
      ...value.settings,
      postingSchedule: {
        ...defaultData.settings.postingSchedule,
        ...value.settings?.postingSchedule,
      },
    },
  };
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
  const hasLoadedRef = useRef(false);
  const hasInitializedPersistenceRef = useRef(false);
  const serverSnapshotRef = useRef<ContentHubData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    async function loadData() {
      try {
        const response = await fetch("/api/data", { signal: abortController.signal });

        if (!response.ok) {
          throw new Error(`Failed to load data: ${response.status}`);
        }

        const nextData = normalizeData((await response.json()) as ContentHubData);

        if (abortController.signal.aborted) {
          return;
        }

        hasLoadedRef.current = true;
        serverSnapshotRef.current = nextData;
        setData(nextData);
        applyTheme(nextData.settings.theme);
      } catch (error) {
        if (abortController.signal.aborted) {
          return;
        }

        console.error("Failed to fetch content hub data:", error);
        const fallbackData = getDefaultData();
        hasLoadedRef.current = true;
        setData(fallbackData);
        applyTheme(fallbackData.settings.theme);
      } finally {
        if (!abortController.signal.aborted) {
          setIsReady(true);
        }
      }
    }

    void loadData();

    return () => abortController.abort();
  }, []);

  useEffect(() => {
    if (!isReady || !hasLoadedRef.current) {
      return;
    }

    applyTheme(data.settings.theme);

    if (!hasInitializedPersistenceRef.current) {
      hasInitializedPersistenceRef.current = true;
      return;
    }

    const snap = serverSnapshotRef.current;
    if (snap) {
      const clientTotal = data.ideas.length + data.posts.length;
      const serverTotal = snap.ideas.length + snap.posts.length;
      if (clientTotal === 0 && serverTotal > 0) {
        return;
      }
    }

    const timeoutId = window.setTimeout(() => {
      void fetch("/api/data", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }).then(() => {
        serverSnapshotRef.current = data;
      }).catch((error: unknown) => {
        console.error("Failed to save content hub data:", error);
      });
    }, 500);

    return () => window.clearTimeout(timeoutId);
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
          imagePrompt: input.imagePrompt,
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
      setIdeaStatus: async (ideaId, status) => {
        const previousIdea = data.ideas.find((idea) => idea.id === ideaId);
        if (!previousIdea || previousIdea.status === status) {
          return;
        }

        const nextUpdatedAt = new Date().toISOString();
        setData((current) => ({
          ...current,
          ideas: current.ideas.map((idea) =>
            idea.id === ideaId ? { ...idea, status, updatedAt: nextUpdatedAt } : idea,
          ),
        }));

        try {
          const response = await fetch("/api/data", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity: "idea",
              id: ideaId,
              status,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to persist idea status: ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to update idea status:", error);
          setData((current) => ({
            ...current,
            ideas: current.ideas.map((idea) => (idea.id === ideaId ? previousIdea : idea)),
          }));
          throw error;
        }
      },
      deleteIdea: (ideaId) => {
        setData((current) => ({
          ...current,
          ideas: current.ideas.filter((idea) => idea.id !== ideaId),
        }));
      },
      deletePost: (postId) => {
        setData((current) => ({
          ...current,
          posts: current.posts.filter((post) => post.id !== postId),
        }));
      },
      archiveIdea: (ideaId) => {
        setData((current) => ({
          ...current,
          ideas: current.ideas.map((idea) =>
            idea.id === ideaId ? { ...idea, archived: true, updatedAt: new Date().toISOString() } : idea,
          ),
        }));
      },
      unarchiveIdea: (ideaId) => {
        setData((current) => ({
          ...current,
          ideas: current.ideas.map((idea) =>
            idea.id === ideaId ? { ...idea, archived: false, updatedAt: new Date().toISOString() } : idea,
          ),
        }));
      },
      archivePost: (postId) => {
        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId ? { ...post, archived: true, updatedAt: new Date().toISOString() } : post,
          ),
        }));
      },
      unarchivePost: (postId) => {
        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId ? { ...post, archived: false, updatedAt: new Date().toISOString() } : post,
          ),
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
          posts: [post, ...current.posts],
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
      setPostStatus: async (postId, status) => {
        const previousPost = data.posts.find((post) => post.id === postId);
        if (!previousPost || previousPost.status === status) {
          return;
        }

        const approvalStatus = getApprovalStatusForPostStatus(status, previousPost.approvalStatus);
        const nextUpdatedAt = new Date().toISOString();

        setData((current) => ({
          ...current,
          posts: current.posts.map((post) =>
            post.id === postId
              ? { ...post, status, approvalStatus, updatedAt: nextUpdatedAt }
              : post,
          ),
        }));

        try {
          const response = await fetch("/api/data", {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              entity: "post",
              id: postId,
              status,
            }),
          });

          if (!response.ok) {
            throw new Error(`Failed to persist post status: ${response.status}`);
          }
        } catch (error) {
          console.error("Failed to update post status:", error);
          setData((current) => ({
            ...current,
            posts: current.posts.map((post) => (post.id === postId ? previousPost : post)),
          }));
          throw error;
        }
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

        const post = data.posts.find((p) => p.id === postId);

        setData((current) => ({
          ...current,
          posts: current.posts.map((p) =>
            p.id === postId
              ? {
                  ...p,
                  comments: [
                    ...p.comments,
                    { id: uuidv4(), text: text.trim(), author, createdAt: new Date().toISOString() },
                  ],
                  updatedAt: new Date().toISOString(),
                }
              : p,
          ),
        }));

        // Fire notification for Zima
        if (author === "edo" && post) {
          void fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "comment",
              postId,
              postTitle: post.title,
              text: text.trim(),
              author: "edo",
            }),
          }).catch(() => {});
        }
      },
      setApprovalStatus: (postId, approvalStatus, comment) => {
        const post = data.posts.find((p) => p.id === postId);

        // Fire notification for Zima
        if (post) {
          const type = approvalStatus === "approved" ? "approval"
            : approvalStatus === "rejected" ? "rejection"
            : "revision";
          void fetch("/api/notify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type,
              postId,
              postTitle: post.title,
              text: comment?.trim() || undefined,
              author: "edo",
              status: approvalStatus,
            }),
          }).catch(() => {});
        }

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
                    ? "draft"
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
        setData(normalizeData(nextData));
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
