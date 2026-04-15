import { sql } from "@/lib/db";
import {
  DEFAULT_LINKEDIN_PROMPT,
  DEFAULT_SUBSTACK_PROMPT,
  buildGeneratePrompt,
} from "@/lib/generate-prompts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { prompt, platform, title, description } = (await request.json()) as {
      prompt: string;
      platform: string;
      title: string;
      description?: string;
    };

    if (!prompt.trim()) {
      return Response.json({ error: "Prompt is required." }, { status: 400 });
    }

    const keyRows = await sql.query("SELECT value FROM settings WHERE key = 'api_keys'");
    const keys = keyRows.length > 0 ? (keyRows[0].value as Record<string, string>) : {};
    const apiKey = keys.openrouter;

    if (!apiKey) {
      return Response.json({ error: "OpenRouter API key not configured. Add it in Settings." }, { status: 400 });
    }

    const configRows = await sql.query("SELECT value FROM settings WHERE key = 'research_config'");
    const config = configRows.length > 0 ? (configRows[0].value as Record<string, string>) : {};
    const model = config.defaultModel || "anthropic/claude-sonnet-4";

    const isLinkedIn = platform.toLowerCase().includes("linkedin");
    const isSubstack = platform.toLowerCase().includes("substack");

    const promptKey = isLinkedIn ? "generate_linkedin_prompt" : isSubstack ? "generate_substack_prompt" : null;
    const defaultTemplate = isLinkedIn ? DEFAULT_LINKEDIN_PROMPT : isSubstack ? DEFAULT_SUBSTACK_PROMPT : null;

    let systemPrompt: string;

    if (promptKey && defaultTemplate) {
      const rows = await sql.query("SELECT value FROM settings WHERE key = $1", [promptKey]);
      const template = rows.length > 0 ? (rows[0].value as string) : defaultTemplate;
      const context = description ? `Context: ${description}` : "";
      systemPrompt = buildGeneratePrompt(template, { title, context });
    } else {
      systemPrompt = `You are an expert content writer. Write a well-structured post about "${title}".
${description ? `Context: ${description}` : ""}
Write in a clear, engaging style appropriate for the platform.`;
    }

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://contenthub.app",
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", response.status, err);
      return Response.json({ error: `OpenRouter returned ${response.status}. Check your API key and model.` }, { status: 502 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content ?? "";

    return Response.json({ content, model: data.model ?? model });
  } catch (error) {
    console.error("Generate API error:", error);
    return Response.json({ error: error instanceof Error ? error.message : "Generation failed." }, { status: 500 });
  }
}
