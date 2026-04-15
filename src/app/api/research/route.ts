import { sql } from "@/lib/db";
import { DEFAULT_RESEARCH_PROMPT, buildResearchPrompt } from "@/lib/research-prompt";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { topic, channel, voice, audiences, context, count } = (await request.json()) as {
      topic: string;
      channel: string;
      voice: string;
      audiences: string[];
      context?: string;
      count?: number;
    };

    if (!topic || !channel || !voice || !audiences?.length) {
      return Response.json({ error: "Missing required fields." }, { status: 400 });
    }

    const keyRows = await sql.query(
      "SELECT value FROM settings WHERE key = 'api_keys'",
    );
    const keys = keyRows.length > 0
      ? (keyRows[0].value as Record<string, string>)
      : {};
    const apiKey = keys.openrouter;

    if (!apiKey) {
      return Response.json(
        { error: "OpenRouter API key not configured. Add it in Settings." },
        { status: 400 },
      );
    }

    const configRows = await sql.query(
      "SELECT value FROM settings WHERE key = 'research_config'",
    );
    const config = configRows.length > 0
      ? (configRows[0].value as Record<string, string>)
      : {};
    const model = config.defaultModel || "anthropic/claude-sonnet-4";

    const ideaCount = Math.min(Math.max(count ?? 3, 1), 10);
    const audienceList = audiences.join(", ");
    const contextBlock = context ? `\n\nADDITIONAL CONTEXT from the user (use this to shape angles, reference specific events, or focus the research):\n${context}` : "";

    const promptRows = await sql.query("SELECT value FROM settings WHERE key = 'research_prompt'");
    const template = promptRows.length > 0
      ? (promptRows[0].value as string)
      : DEFAULT_RESEARCH_PROMPT;

    const prompt = buildResearchPrompt(template, {
      topic,
      channel,
      voice,
      audience: audienceList,
      context: contextBlock,
      count: ideaCount,
    });

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://contenthub.app",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter error:", response.status, err);
      return Response.json(
        { error: `OpenRouter returned ${response.status}. Check your API key and model name.` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? "[]";
    const modelUsed = data.model ?? model;

    let ideas: unknown[];
    try {
      const cleaned = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      ideas = JSON.parse(cleaned);
      if (!Array.isArray(ideas)) throw new Error("Not an array");
    } catch {
      return Response.json({
        ideas: [],
        raw,
        model: modelUsed,
        error: "Failed to parse structured response. Raw output included.",
      });
    }

    return Response.json({ ideas, model: modelUsed });
  } catch (error) {
    console.error("Research API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Research generation failed." },
      { status: 500 },
    );
  }
}
