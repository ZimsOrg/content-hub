import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { prompt, platform, title, description, imagePrompt } = (await request.json()) as {
      prompt: string;
      platform: string;
      title: string;
      description?: string;
      imagePrompt?: string;
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

    let systemPrompt: string;

    if (isLinkedIn) {
      systemPrompt = `You are an expert LinkedIn content writer. Write a LinkedIn post that:

STRUCTURE:
- HOOK (first 2 lines): These are the only lines visible before "...see more". They MUST stop the scroll. Use a bold claim, surprising stat, counterintuitive take, or pattern interrupt. These 2 lines decide if anyone reads the rest.
- BODY: Short paragraphs (1-3 lines each). Use line breaks between every paragraph. Use → bullets for lists. Be specific, not generic. Include concrete numbers, examples, or frameworks.
- CTA: End with a question or call to engage that invites comments.

RULES:
- No hashtags in the body (add 3-5 at the very end, separated by a blank line)
- No emojis in the hook
- Keep under 1300 characters for optimal reach
- Write in first person, conversational but authoritative
- Every paragraph should earn the next paragraph

The post is about: "${title}"
${description ? `Context: ${description}` : ""}`;
    } else if (isSubstack) {
      systemPrompt = `You are an expert long-form newsletter writer. Write a Substack article that:

STRUCTURE:
- OPENING: Start with a story, scene, or provocative observation that pulls the reader in. No "In this article, I'll cover..." — just drop them into the narrative.
- SECTIONS: Use clear H2 headers for each major section. Each section should:
  - Open with a key insight or claim
  - Support it with evidence, examples, or personal experience
  - Close with a transition to the next section
- For tutorials: structure as step-by-step with numbered sections. Each step should explain WHAT, WHY, and HOW. Include [IMAGE: description of what screenshot or diagram should show here] placeholders between steps.
- CLOSING: End with a takeaway that reframes the opening, plus a clear next action for the reader.

RULES:
- Target 800-1500 words
- Use subheaders (##) to break up sections
- Include pull quotes or bold key phrases for scannability
- Write in first person, blend analysis with personal perspective
- Include [IMAGE: ...] placeholders where visuals would help explain concepts
- Make each section independently valuable — readers should get value even if they skim

The article is about: "${title}"
${description ? `Context: ${description}` : ""}`;
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
