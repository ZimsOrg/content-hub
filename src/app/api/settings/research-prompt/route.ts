import { sql } from "@/lib/db";
import { DEFAULT_RESEARCH_PROMPT } from "@/lib/research-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'research_prompt'",
    );
    const stored = rows.length > 0 ? (rows[0].value as string) : null;
    return Response.json({
      prompt: stored || DEFAULT_RESEARCH_PROMPT,
      isCustom: Boolean(stored),
      defaultPrompt: DEFAULT_RESEARCH_PROMPT,
    });
  } catch (error) {
    console.error("GET research-prompt error:", error);
    return Response.json({ prompt: DEFAULT_RESEARCH_PROMPT, isCustom: false, defaultPrompt: DEFAULT_RESEARCH_PROMPT });
  }
}

export async function PUT(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt: string | null };

    if (prompt === null || prompt === DEFAULT_RESEARCH_PROMPT) {
      await sql.query("DELETE FROM settings WHERE key = 'research_prompt'");
      return Response.json({ prompt: DEFAULT_RESEARCH_PROMPT, isCustom: false });
    }

    await sql.query(
      `INSERT INTO settings (key, value) VALUES ('research_prompt', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(prompt)],
    );

    return Response.json({ prompt, isCustom: true });
  } catch (error) {
    console.error("PUT research-prompt error:", error);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}
