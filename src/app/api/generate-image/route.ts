import { sql } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { prompt } = (await request.json()) as { prompt: string };

    if (!prompt?.trim()) {
      return Response.json({ error: "Image prompt is required." }, { status: 400 });
    }

    const keyRows = await sql.query("SELECT value FROM settings WHERE key = 'api_keys'");
    const keys = keyRows.length > 0 ? (keyRows[0].value as Record<string, string>) : {};
    const apiKey = keys.openrouter;

    if (!apiKey) {
      return Response.json({ error: "OpenRouter API key not configured. Add it in Settings." }, { status: 400 });
    }

    const configRows = await sql.query("SELECT value FROM settings WHERE key = 'research_config'");
    const config = configRows.length > 0 ? (configRows[0].value as Record<string, string>) : {};
    const model = config.imageModel || "google/gemini-2.5-flash-preview-05-20";

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://contenthub.app",
      },
      body: JSON.stringify({
        model,
        modalities: ["image", "text"],
        messages: [
          {
            role: "user",
            content: `Generate a small, optimized image (max 800x600 pixels) based on this description: ${prompt.trim()}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("OpenRouter image error:", response.status, err);
      return Response.json(
        { error: `Image generation returned ${response.status}. Check your API key and image model in Settings.` },
        { status: 502 },
      );
    }

    const data = await response.json();
    const message = data.choices?.[0]?.message;
    const content = message?.content;
    const images = message?.images as { type: string; image_url?: { url: string }; url?: string }[] | undefined;

    let imageUrl: string | null = null;

    if (Array.isArray(images)) {
      for (const img of images) {
        if (img.image_url?.url) { imageUrl = img.image_url.url; break; }
        if (img.url) { imageUrl = img.url; break; }
      }
    }

    if (!imageUrl && Array.isArray(content)) {
      for (const part of content) {
        if (part.type === "image_url" && part.image_url?.url) { imageUrl = part.image_url.url; break; }
        if (part.type === "image" && (part.image?.url || part.url)) { imageUrl = part.image?.url || part.url; break; }
        if (part.inline_data?.data) { imageUrl = `data:${part.inline_data.mime_type || "image/png"};base64,${part.inline_data.data}`; break; }
        if (part.b64_json) { imageUrl = `data:image/png;base64,${part.b64_json}`; break; }
      }
    }

    if (!imageUrl && typeof content === "string") {
      const b64 = content.match(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/);
      if (b64) imageUrl = b64[0];
      const urlMatch = content.match(/(https?:\/\/[^\s"'>]+\.(?:png|jpg|jpeg|webp|gif))/i);
      if (!imageUrl && urlMatch) imageUrl = urlMatch[1];
    }

    if (!imageUrl) {
      return Response.json(
        { error: "No image was returned. Try a different prompt or image model." },
        { status: 502 },
      );
    }

    return Response.json({ url: imageUrl });
  } catch (error) {
    console.error("Generate image error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Image generation failed." },
      { status: 500 },
    );
  }
}
