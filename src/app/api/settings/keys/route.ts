import { sql } from "@/lib/db";
import type { ApiKeyEntry } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PROVIDERS = [
  { provider: "openrouter", label: "OpenRouter" },
  { provider: "openai", label: "OpenAI" },
  { provider: "anthropic", label: "Anthropic" },
  { provider: "firecrawl", label: "Firecrawl" },
  { provider: "perplexity", label: "Perplexity" },
];

export async function GET() {
  try {
    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'api_keys'",
    );
    const stored: Record<string, string> = rows.length > 0
      ? (rows[0].value as Record<string, string>)
      : {};

    const entries: ApiKeyEntry[] = PROVIDERS.map(({ provider, label }) => ({
      provider,
      label,
      hasKey: Boolean(stored[provider]),
    }));

    return Response.json(entries);
  } catch (error) {
    console.error("GET /api/settings/keys error:", error);
    return Response.json([], { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { provider, key } = (await request.json()) as { provider: string; key: string };

    if (!PROVIDERS.some((p) => p.provider === provider)) {
      return Response.json({ error: "Unknown provider" }, { status: 400 });
    }

    const rows = await sql.query(
      "SELECT value FROM settings WHERE key = 'api_keys'",
    );
    const stored: Record<string, string> = rows.length > 0
      ? (rows[0].value as Record<string, string>)
      : {};

    if (key) {
      stored[provider] = key;
    } else {
      delete stored[provider];
    }

    await sql.query(
      `INSERT INTO settings (key, value) VALUES ('api_keys', $1::jsonb)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [JSON.stringify(stored)],
    );

    const entries: ApiKeyEntry[] = PROVIDERS.map(({ provider: p, label }) => ({
      provider: p,
      label,
      hasKey: Boolean(stored[p]),
    }));

    return Response.json(entries);
  } catch (error) {
    console.error("PUT /api/settings/keys error:", error);
    return Response.json({ error: "Failed to save key" }, { status: 500 });
  }
}
