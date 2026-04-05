import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ideas — add a new idea
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      title: string;
      description?: string;
      platform?: string;
      postType?: string;
      priority?: string;
      status?: string;
      tags?: string[];
    };

    if (!body.title?.trim()) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await sql.query(
      `INSERT INTO ideas (id, title, description, platform, post_type, priority, status, tags, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        body.title.trim(),
        body.description?.trim() || null,
        body.platform || "linkedin",
        body.postType || "trenches",
        body.priority || "medium",
        body.status || "new",
        body.tags || [],
        now,
        now,
      ],
    );

    return Response.json({ id, title: body.title.trim(), createdAt: now });
  } catch (error) {
    console.error("POST /api/ideas error:", error);
    return Response.json({ error: "Failed to create idea." }, { status: 500 });
  }
}
