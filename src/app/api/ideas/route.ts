import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/ideas — add a new idea
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      title: string;
      description?: string;
      platform?: string;
      postType?: string;
      priority?: string;
      status?: string;
      tags?: string[];
      imagePrompt?: string;
    };

    if (!body.title?.trim()) {
      return Response.json({ error: "title is required" }, { status: 400 });
    }

    const id = body.id || uuidv4();
    const now = new Date().toISOString();

    await sql.query(
      `INSERT INTO ideas (id, title, description, platform, post_type, priority, status, tags, image_prompt, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        body.title.trim(),
        body.description?.trim() || null,
        body.platform || "linkedin",
        body.postType || "trenches",
        body.priority || "medium",
        body.status || "new",
        body.tags || [],
        body.imagePrompt || null,
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await sql.query("DELETE FROM ideas WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/ideas error:", error);
    return Response.json({ error: "Failed to delete idea." }, { status: 500 });
  }
}
