import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// POST /api/notify — notify about content hub activity
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type: "comment" | "approval" | "rejection" | "revision";
      postId: string;
      postTitle: string;
      text?: string;
      author?: string;
      status?: string;
    };

    await sql.query(
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        post_id TEXT NOT NULL,
        post_title TEXT NOT NULL,
        text TEXT,
        author TEXT,
        status TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );

    await sql.query(
      `INSERT INTO notifications (type, post_id, post_title, text, author, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [body.type, body.postId, body.postTitle, body.text || null, body.author || null, body.status || null]
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("POST /api/notify error:", error);
    return Response.json({ error: "Failed to create notification." }, { status: 500 });
  }
}

// GET /api/notify — get unread notifications (for Zima to poll)
export async function GET() {
  try {
    await sql.query(
      `CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        type TEXT NOT NULL,
        post_id TEXT NOT NULL,
        post_title TEXT NOT NULL,
        text TEXT,
        author TEXT,
        status TEXT,
        read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )`
    );

    const rows = await sql.query(
      `SELECT * FROM notifications WHERE read = FALSE ORDER BY created_at DESC LIMIT 20`
    );

    if (rows.length > 0) {
      await sql.query(`UPDATE notifications SET read = TRUE WHERE read = FALSE`);
    }

    return Response.json({ notifications: rows });
  } catch (error) {
    console.error("GET /api/notify error:", error);
    return Response.json({ error: "Failed to fetch notifications." }, { status: 500 });
  }
}
