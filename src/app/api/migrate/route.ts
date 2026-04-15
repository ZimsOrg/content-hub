import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await sql.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id TEXT PRIMARY KEY,
        post_id TEXT NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        author TEXT NOT NULL DEFAULT 'zima',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await sql.query(`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE`);
    await sql.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT FALSE`);
    await sql.query(`ALTER TABLE ideas ADD COLUMN IF NOT EXISTS image_prompt TEXT`);
    await sql.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS image_prompt TEXT`);

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Migration error:", error);
    return Response.json(
      { error: "Migration failed", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
