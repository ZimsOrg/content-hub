import { sql } from "@/lib/db";
import { DEFAULT_LINKEDIN_PROMPT, DEFAULT_SUBSTACK_PROMPT } from "@/lib/generate-prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const linkedinRows = await sql.query("SELECT value FROM settings WHERE key = 'generate_linkedin_prompt'");
    const substackRows = await sql.query("SELECT value FROM settings WHERE key = 'generate_substack_prompt'");

    return Response.json({
      linkedin: {
        prompt: linkedinRows.length > 0 ? (linkedinRows[0].value as string) : DEFAULT_LINKEDIN_PROMPT,
        isCustom: linkedinRows.length > 0,
      },
      substack: {
        prompt: substackRows.length > 0 ? (substackRows[0].value as string) : DEFAULT_SUBSTACK_PROMPT,
        isCustom: substackRows.length > 0,
      },
      defaults: {
        linkedin: DEFAULT_LINKEDIN_PROMPT,
        substack: DEFAULT_SUBSTACK_PROMPT,
      },
    });
  } catch (error) {
    console.error("GET generate-prompts error:", error);
    return Response.json({
      linkedin: { prompt: DEFAULT_LINKEDIN_PROMPT, isCustom: false },
      substack: { prompt: DEFAULT_SUBSTACK_PROMPT, isCustom: false },
      defaults: { linkedin: DEFAULT_LINKEDIN_PROMPT, substack: DEFAULT_SUBSTACK_PROMPT },
    });
  }
}

export async function PUT(request: Request) {
  try {
    const { platform, prompt } = (await request.json()) as { platform: "linkedin" | "substack"; prompt: string | null };
    const key = `generate_${platform}_prompt`;
    const defaultPrompt = platform === "linkedin" ? DEFAULT_LINKEDIN_PROMPT : DEFAULT_SUBSTACK_PROMPT;

    if (prompt === null || prompt === defaultPrompt) {
      await sql.query("DELETE FROM settings WHERE key = $1", [key]);
      return Response.json({ prompt: defaultPrompt, isCustom: false });
    }

    await sql.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [key, JSON.stringify(prompt)],
    );

    return Response.json({ prompt, isCustom: true });
  } catch (error) {
    console.error("PUT generate-prompts error:", error);
    return Response.json({ error: "Failed to save" }, { status: 500 });
  }
}
