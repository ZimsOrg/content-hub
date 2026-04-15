import { sql } from "@/lib/db";

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

    const prompt = `You are a content research engine that operates in three layers to find high-signal content ideas.

YOUR RESEARCH PROCESS (follow this mentally for each idea):

LAYER 1 — Social Signal Analysis
Think about what real people are complaining about, excited about, or debating right now on X/Twitter, Reddit, and LinkedIn related to "${topic}". What pain points keep coming up? What tools or approaches are people frustrated with? What's generating genuine engagement (not just hype)?

LAYER 2 — Deep Technical Research  
For each signal from Layer 1, think about the technical reality: What do the docs actually say? What are competitors doing? Where is there a gap between what's promised and what's delivered? What would a deep-dive into the actual product/tool/approach reveal?

LAYER 3 — Synthesis & Angle
Cross-reference Layer 1 (demand signal) with Layer 2 (technical reality) to create a unique angle. The angle should be builder-focused — not regurgitating news, but offering a perspective that comes from someone who actually builds things.

PARAMETERS:
- Topic: ${topic}
- Channel: ${channel} — tailor the format, length, and structure for this platform
- Voice: ${voice} — this determines the entire tone: titles, hooks, everything
- Audience: ${audienceList} — use their language, reference their problems
${contextBlock}

Generate exactly ${ideaCount} content ideas. Each idea must be grounded in a real signal (Layer 1), backed by substance (Layer 2), and framed with a distinct angle (Layer 3).

For EACH idea, also generate an image prompt that can be used with any image generation model (DALL-E, Midjourney, Stable Diffusion, etc.).

IMAGE PROMPT RULES:
- Style: Studio Ghibli-inspired, soft watercolor palette, warm muted tones, gentle lighting
- Keep it SIMPLE — minimal elements, clean composition, lots of breathing room
- No cluttered or busy scenes. One clear focal point.
- Can be: a metaphorical illustration, a simple chart/diagram, text-based graphic, a person in a scene, or an abstract concept visualization
- Must be eye-catching for social media and visually speak to the content's message
- The prompt should be self-contained and portable — usable on any image model without extra context

RESPOND WITH ONLY a valid JSON array. No markdown, no code fences, no explanation outside the JSON. Each object must have exactly these fields:
[
  {
    "title": "compelling headline in the ${voice} voice",
    "summary": "2-3 sentence pitch explaining the angle and why it matters to ${audienceList} right now",
    "signal": "the Layer 1 social signal or trend this is based on (1 sentence)",
    "format": "specific format for ${channel} (e.g. 'LinkedIn text post, ~1200 chars' or 'Substack essay, 1000 words')",
    "tags": ["2-3 relevant topic tags"],
    "imagePrompt": "detailed image generation prompt in Studio Ghibli style, soft colors, simple composition"
  }
]`;

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
