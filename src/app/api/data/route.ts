import { sql } from "@/lib/db";
import { seedContentHubData } from "@/lib/seed-data";
import type {
  AnalyticsEntry,
  Comment,
  ContentHubData,
  Idea,
  Post,
  PostMetrics,
  Revision,
  Settings,
} from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDefaultData(): ContentHubData {
  return structuredClone(seedContentHubData);
}

// ---------------------------------------------------------------------------
// GET — read full state from Postgres
// ---------------------------------------------------------------------------

async function readIdeas(): Promise<Idea[]> {
  const rows = await sql.query("SELECT * FROM ideas ORDER BY created_at DESC");
  return rows.map((r: Record<string, unknown>) => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string) || undefined,
    platform: r.platform as Idea["platform"],
    postType: r.post_type as Idea["postType"],
    priority: r.priority as Idea["priority"],
    status: r.status as Idea["status"],
    tags: (r.tags as string[]) || [],
    createdAt: (r.created_at as Date).toISOString(),
    updatedAt: (r.updated_at as Date).toISOString(),
    scheduledPostIds: [],
  }));
}

async function readPosts(): Promise<Post[]> {
  const postRows = await sql.query(
    "SELECT * FROM posts ORDER BY scheduled_at ASC",
  );
  const commentRows = await sql.query(
    "SELECT * FROM comments ORDER BY created_at ASC",
  );
  const revisionRows = await sql.query(
    "SELECT * FROM revisions ORDER BY created_at ASC",
  );
  const metricRows = await sql.query("SELECT * FROM post_metrics");

  const commentsByPost = new Map<string, Comment[]>();
  for (const c of commentRows) {
    const postId = c.post_id as string;
    if (!commentsByPost.has(postId)) commentsByPost.set(postId, []);
    commentsByPost.get(postId)!.push({
      id: c.id as string,
      text: c.text as string,
      author: c.author as Comment["author"],
      createdAt: (c.created_at as Date).toISOString(),
    });
  }

  const revisionsByPost = new Map<string, Revision[]>();
  for (const r of revisionRows) {
    const postId = r.post_id as string;
    if (!revisionsByPost.has(postId)) revisionsByPost.set(postId, []);
    revisionsByPost.get(postId)!.push({
      id: r.id as string,
      content: r.content as string,
      createdAt: (r.created_at as Date).toISOString(),
    });
  }

  const metricsByPost = new Map<string, PostMetrics>();
  for (const m of metricRows) {
    metricsByPost.set(m.post_id as string, {
      impressions: m.impressions as number,
      comments: m.comments as number,
      reposts: m.reposts as number,
      reactions: m.reactions as number,
      followerDelta: m.follower_delta as number,
    });
  }

  return postRows.map((r: Record<string, unknown>) => {
    const postId = r.id as string;
    return {
      id: postId,
      ideaId: (r.idea_id as string) || undefined,
      title: r.title as string,
      content: r.content as string,
      imageUrl: (r.image_url as string) || undefined,
      platform: r.platform as Post["platform"],
      postType: r.post_type as Post["postType"],
      scheduledAt: (r.scheduled_at as Date).toISOString(),
      status: r.status as Post["status"],
      approvalStatus: (r.approval_status as Post["approvalStatus"]) || undefined,
      comments: commentsByPost.get(postId) || [],
      revisions: revisionsByPost.get(postId) || [],
      metrics: metricsByPost.get(postId),
      createdAt: (r.created_at as Date).toISOString(),
      updatedAt: (r.updated_at as Date).toISOString(),
    };
  });
}

async function readAnalytics(): Promise<AnalyticsEntry[]> {
  const rows = await sql.query("SELECT * FROM analytics ORDER BY date ASC");
  return rows.map((r: Record<string, unknown>) => ({
    date: (r.date as string).substring(0, 10),
    linkedinFollowers: (r.linkedin_followers as number) || undefined,
    substackSubscribers: (r.substack_subscribers as number) || undefined,
  }));
}

async function readSettings(): Promise<Settings> {
  const defaults = getDefaultData().settings;
  const rows = await sql.query("SELECT key, value FROM settings");

  const map = new Map<string, unknown>();
  for (const r of rows) {
    map.set(r.key as string, r.value);
  }

  return {
    theme: (map.get("theme") as Settings["theme"]) || defaults.theme,
    postingSchedule: (map.get("postingSchedule") as Settings["postingSchedule"]) || defaults.postingSchedule,
    notificationsEnabled: map.has("notificationsEnabled")
      ? (map.get("notificationsEnabled") as boolean)
      : defaults.notificationsEnabled,
  };
}

export async function GET() {
  try {
    const [ideas, posts, analytics, settings] = await Promise.all([
      readIdeas(),
      readPosts(),
      readAnalytics(),
      readSettings(),
    ]);

    // Backfill scheduledPostIds on ideas
    for (const idea of ideas) {
      idea.scheduledPostIds = posts
        .filter((p) => p.ideaId === idea.id)
        .map((p) => p.id);
    }

    const data: ContentHubData = { ideas, posts, analytics, settings };
    return Response.json(data);
  } catch (error) {
    console.error("GET /api/data error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return Response.json(
      { error: "Failed to load content hub data.", detail: message },
      { status: 500 },
    );
  }
}

// ---------------------------------------------------------------------------
// PUT — full state write (upsert everything)
// ---------------------------------------------------------------------------

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as ContentHubData;

    if (!Array.isArray(payload.ideas) || !Array.isArray(payload.posts)) {
      return Response.json({ error: "Invalid payload." }, { status: 400 });
    }

    // -- Ideas: upsert --
    const existingIdeaIds = (
      await sql.query("SELECT id FROM ideas")
    ).map((r: Record<string, unknown>) => r.id as string);
    const incomingIdeaIds = new Set(payload.ideas.map((i) => i.id));

    // Delete removed ideas
    for (const id of existingIdeaIds) {
      if (!incomingIdeaIds.has(id)) {
        await sql.query("DELETE FROM ideas WHERE id = $1", [id]);
      }
    }

    // Upsert ideas
    for (const idea of payload.ideas) {
      await sql.query(
        `INSERT INTO ideas (id, title, description, platform, post_type, priority, status, tags, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           title = EXCLUDED.title,
           description = EXCLUDED.description,
           platform = EXCLUDED.platform,
           post_type = EXCLUDED.post_type,
           priority = EXCLUDED.priority,
           status = EXCLUDED.status,
           tags = EXCLUDED.tags,
           updated_at = EXCLUDED.updated_at`,
        [
          idea.id, idea.title, idea.description || null,
          idea.platform, idea.postType, idea.priority, idea.status,
          idea.tags || [], idea.createdAt, idea.updatedAt,
        ],
      );
    }

    // -- Posts: upsert --
    const existingPostIds = (
      await sql.query("SELECT id FROM posts")
    ).map((r: Record<string, unknown>) => r.id as string);
    const incomingPostIds = new Set(payload.posts.map((p) => p.id));

    // Delete removed posts (cascade deletes comments, revisions, metrics)
    for (const id of existingPostIds) {
      if (!incomingPostIds.has(id)) {
        await sql.query("DELETE FROM posts WHERE id = $1", [id]);
      }
    }

    // Upsert posts + nested data
    for (const post of payload.posts) {
      await sql.query(
        `INSERT INTO posts (id, idea_id, title, content, image_url, platform, post_type, scheduled_at, status, approval_status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (id) DO UPDATE SET
           idea_id = EXCLUDED.idea_id,
           title = EXCLUDED.title,
           content = EXCLUDED.content,
           image_url = EXCLUDED.image_url,
           platform = EXCLUDED.platform,
           post_type = EXCLUDED.post_type,
           scheduled_at = EXCLUDED.scheduled_at,
           status = EXCLUDED.status,
           approval_status = EXCLUDED.approval_status,
           updated_at = EXCLUDED.updated_at`,
        [
          post.id, post.ideaId || null, post.title, post.content,
          post.imageUrl || null, post.platform, post.postType,
          post.scheduledAt, post.status, post.approvalStatus || "pending",
          post.createdAt, post.updatedAt,
        ],
      );

      // Replace comments
      await sql.query("DELETE FROM comments WHERE post_id = $1", [post.id]);
      for (const c of post.comments || []) {
        await sql.query(
          `INSERT INTO comments (id, post_id, text, author, created_at) VALUES ($1, $2, $3, $4, $5)`,
          [c.id, post.id, c.text, c.author, c.createdAt],
        );
      }

      // Replace revisions
      await sql.query("DELETE FROM revisions WHERE post_id = $1", [post.id]);
      for (const r of post.revisions || []) {
        await sql.query(
          `INSERT INTO revisions (id, post_id, content, created_at) VALUES ($1, $2, $3, $4)`,
          [r.id, post.id, r.content, r.createdAt],
        );
      }

      // Upsert metrics
      if (post.metrics) {
        await sql.query(
          `INSERT INTO post_metrics (post_id, impressions, comments, reposts, reactions, follower_delta)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (post_id) DO UPDATE SET
             impressions = EXCLUDED.impressions,
             comments = EXCLUDED.comments,
             reposts = EXCLUDED.reposts,
             reactions = EXCLUDED.reactions,
             follower_delta = EXCLUDED.follower_delta`,
          [
            post.id, post.metrics.impressions || 0, post.metrics.comments || 0,
            post.metrics.reposts || 0, post.metrics.reactions || 0,
            post.metrics.followerDelta || 0,
          ],
        );
      } else {
        await sql.query("DELETE FROM post_metrics WHERE post_id = $1", [post.id]);
      }
    }

    // -- Analytics: upsert --
    await sql.query("DELETE FROM analytics");
    for (const entry of payload.analytics || []) {
      await sql.query(
        `INSERT INTO analytics (date, linkedin_followers, substack_subscribers) VALUES ($1, $2, $3)`,
        [entry.date, entry.linkedinFollowers || null, entry.substackSubscribers || null],
      );
    }

    // -- Settings: upsert --
    if (payload.settings) {
      const entries: [string, unknown][] = [
        ["theme", payload.settings.theme],
        ["postingSchedule", payload.settings.postingSchedule],
        ["notificationsEnabled", payload.settings.notificationsEnabled],
      ];
      for (const [key, value] of entries) {
        await sql.query(
          `INSERT INTO settings (key, value) VALUES ($1, $2)
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
          [key, JSON.stringify(value)],
        );
      }
    }

    // Return fresh state
    const response = await GET();
    return response;
  } catch (error) {
    console.error("PUT /api/data error:", error);
    return Response.json(
      { error: "Failed to save content hub data." },
      { status: 500 },
    );
  }
}
