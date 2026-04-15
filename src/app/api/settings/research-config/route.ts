import { sql } from "@/lib/db";
import type { ResearchConfig } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_CONFIG: ResearchConfig = {
  topicSeeds: [],
  defaultModel: "anthropic/claude-sonnet-4",
  searchModel: "perplexity/sonar-pro",
  imageModel: "google/gemini-2.5-flash-preview-05-20",
};

export async function GET() {
  try {
    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'research_config'",
    );
    const stored = rows.length > 0
      ? (rows[0].value as Partial<ResearchConfig>)
      : {};

    return Response.json({ ...DEFAULT_CONFIG, ...stored });
  } catch (error) {
    console.error("GET /api/settings/research-config error:", error);
    return Response.json(DEFAULT_CONFIG);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<ResearchConfig>;
    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'research_config'",
    );
    const stored = rows.length > 0
      ? (rows[0].value as Partial<ResearchConfig>)
      : {};

    const merged = { ...DEFAULT_CONFIG, ...stored, ...body };

    await sql.query(
      `INSERT INTO settings (key, value) VALUES ('research_config', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(merged)],
    );

    return Response.json(merged);
  } catch (error) {
    console.error("PUT /api/settings/research-config error:", error);
    return Response.json({ error: "Failed to save config" }, { status: 500 });
  }
}
