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
- NEVER use em dashes (—). Use commas, periods, or colons instead.
- Keep under 1300 characters for optimal reach
- Write in first person, conversational but authoritative
- Every paragraph should earn the next paragraph

The post is about: "${title}"
${description ? `Context: ${description}` : ""}`;
    } else if (isSubstack) {
      systemPrompt = `You are an expert Substack newsletter writer. Write a long-form article formatted for direct copy-paste into Substack's editor.

FORMAT — use these EXACT markdown conventions (Substack renders them natively):

# Article Title
Use a single # for the main title at the very top.

## Section Headers  
Use ## for every major section. Every 2-3 paragraphs should have a new ## header.

### Sub-section Headers
Use ### when a section has sub-parts (especially for tutorials/step-by-step).

**Bold key phrases** for scannability — Substack renders these as bold text.

> Use blockquotes for pull quotes, key takeaways, or the single most important line in a section. Substack styles these beautifully.

- Use bullet lists for frameworks, steps, or grouped points
- Each bullet should be substantive, not just a label

1. Use numbered lists for sequential steps or ranked items
2. Each step should explain WHAT and WHY, not just WHAT

---
Use horizontal rules (---) to separate major sections when the topic shifts significantly.

[IMAGE: Describe exactly what image, diagram, chart, or screenshot should go here. Be specific — e.g. "Screenshot showing the settings panel with the API key field highlighted" or "Simple diagram showing data flowing from Source → Transform → Output"]

Place [IMAGE: ...] placeholders between sections, after key explanations, and especially between tutorial steps. These tell the author where to insert visuals.

STRUCTURE:
1. OPENING (no header): Start with a story, scene, or provocative hook. Drop the reader into the narrative immediately. 2-3 short paragraphs.
2. CONTEXT SECTION (## header): Set up why this matters right now. What changed? What's broken? What opportunity exists?
3. MAIN SECTIONS (## headers each): 3-5 sections, each with a clear insight. Each section should stand alone — a reader skimming headers and bold text should still get the core value.
4. For TUTORIALS: use ### for each step. Each step has: what to do, why it matters, and a [IMAGE: ...] placeholder showing the result.
5. CLOSING SECTION (## header): Reframe the opening. Give one clear takeaway and a specific next action.

RULES:
- Target 1000-2000 words
- Write in first person, blend sharp analysis with personal experience
- NEVER use em dashes (—). Use commas, periods, or colons instead.
- Every section earns the next section, no filler
- Bold the single most important sentence in each section
- Include at least 3 [IMAGE: ...] placeholders spread through the article
- End sections with a one-line transition that creates curiosity for the next section

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
