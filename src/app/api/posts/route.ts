import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/posts — add a new post (draft)
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title: string;
      content: string;
      ideaId?: string;
      imageUrl?: string;
      platform?: string;
      postType?: string;
      scheduledAt?: string;
      status?: string;
      approvalStatus?: string;
    };

    if (!body.title?.trim() || !body.content?.trim()) {
      return Response.json(
        { error: "title and content are required" },
        { status: 400 },
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await sql.query(
      `INSERT INTO posts (id, idea_id, title, content, image_url, platform, post_type, scheduled_at, status, approval_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        id,
        body.ideaId || null,
        body.title.trim(),
        body.content.trim(),
        body.imageUrl || null,
        body.platform || "linkedin",
        body.postType || "trenches",
        body.scheduledAt || now,
        body.status || "draft",
        body.approvalStatus || "pending",
        now,
        now,
      ],
    );

    return Response.json({
      id,
      title: body.title.trim(),
      status: body.status || "draft",
      createdAt: now,
    });
  } catch (error) {
    console.error("POST /api/posts error:", error);
    return Response.json({ error: "Failed to create post." }, { status: 500 });
  }
}
