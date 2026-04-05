import { sql } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/comments — add a comment to a post
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      postId: string;
      text: string;
      author?: "edo" | "zima";
    };

    if (!body.postId?.trim() || !body.text?.trim()) {
      return Response.json(
        { error: "postId and text are required" },
        { status: 400 },
      );
    }

    const id = uuidv4();
    const now = new Date().toISOString();

    await sql.query(
      `INSERT INTO comments (id, post_id, text, author, created_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [id, body.postId, body.text.trim(), body.author || "zima", now],
    );

    return Response.json({
      id,
      postId: body.postId,
      author: body.author || "zima",
      createdAt: now,
    });
  } catch (error) {
    console.error("POST /api/comments error:", error);
    return Response.json(
      { error: "Failed to create comment." },
      { status: 500 },
    );
  }
}
