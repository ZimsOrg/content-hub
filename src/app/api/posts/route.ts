import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  try {
    const { id, ...patch } = (await request.json()) as { id: string; [key: string]: unknown };

    if (!id) {
      return Response.json({ error: "id is required" }, { status: 400 });
    }

    const fieldMap: Record<string, string> = {
      scheduledAt: "scheduled_at",
      imageUrl: "image_url",
      imagePrompt: "image_prompt",
      sectionImages: "section_images",
      status: "status",
      approvalStatus: "approval_status",
      title: "title",
      content: "content",
      archived: "archived",
    };

    const sets: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [id];
    let paramIdx = 2;

    for (const [key, value] of Object.entries(patch)) {
      const col = fieldMap[key];
      if (!col) continue;
      if (key === "sectionImages") {
        sets.push(`${col} = $${paramIdx}::jsonb`);
        values.push(JSON.stringify(value));
      } else {
        sets.push(`${col} = $${paramIdx}`);
        values.push(value ?? null);
      }
      paramIdx++;
    }

    if (sets.length <= 1) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await sql.query(
      `UPDATE posts SET ${sets.join(", ")} WHERE id = $1`,
      values,
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("PATCH /api/posts error:", error);
    return Response.json({ error: "Failed to update post." }, { status: 500 });
  }
}

// POST /api/posts — add a new post (draft)
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
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

    if (!body.title?.trim()) {
      return Response.json(
        { error: "title is required" },
        { status: 400 },
      );
    }

    const id = body.id || uuidv4();
    const now = new Date().toISOString();

    await sql.query(
      `INSERT INTO posts (id, idea_id, title, content, image_url, platform, post_type, scheduled_at, status, approval_status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (id) DO NOTHING`,
      [
        id,
        body.ideaId || null,
        body.title.trim(),
        (body.content || "").trim(),
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

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return Response.json({ error: "id required" }, { status: 400 });
    await sql.query("DELETE FROM posts WHERE id = $1", [id]);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("DELETE /api/posts error:", error);
    return Response.json({ error: "Failed to delete post." }, { status: 500 });
  }
}
