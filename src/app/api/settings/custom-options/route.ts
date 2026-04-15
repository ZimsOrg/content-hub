import { sql } from "@/lib/db";
import type { CustomOptions } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULTS: CustomOptions = {
  topics: ["AI Side Projects", "Developer Tools", "Content Strategy"],
  channels: ["LinkedIn", "Substack"],
  voices: ["Professional", "Contrarian", "Technical", "Casual"],
  audiences: ["Developers", "Founders", "PMs"],
};

export async function GET() {
  try {
    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'custom_options'",
    );
    const stored = rows.length > 0
      ? (rows[0].value as Partial<CustomOptions>)
      : {};

    return Response.json({ ...DEFAULTS, ...stored });
  } catch (error) {
    console.error("GET /api/settings/custom-options error:", error);
    return Response.json(DEFAULTS);
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as Partial<CustomOptions>;
    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'custom_options'",
    );
    const stored = rows.length > 0
      ? (rows[0].value as Partial<CustomOptions>)
      : {};

    const merged: CustomOptions = {
      topics: body.topics ?? stored.topics ?? DEFAULTS.topics,
      channels: body.channels ?? stored.channels ?? DEFAULTS.channels,
      voices: body.voices ?? stored.voices ?? DEFAULTS.voices,
      audiences: body.audiences ?? stored.audiences ?? DEFAULTS.audiences,
    };

    await sql.query(
      `INSERT INTO settings (key, value) VALUES ('custom_options', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(merged)],
    );

    return Response.json(merged);
  } catch (error) {
    console.error("PUT /api/settings/custom-options error:", error);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}
