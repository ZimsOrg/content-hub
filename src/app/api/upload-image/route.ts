import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { dataUrl } = (await request.json()) as { dataUrl: string };

    if (!dataUrl) {
      return Response.json({ error: "No image data provided." }, { status: 400 });
    }

    const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      if (dataUrl.startsWith("http")) {
        return Response.json({ url: dataUrl });
      }
      return Response.json({ error: "Invalid image data." }, { status: 400 });
    }

    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const buffer = Buffer.from(match[2], "base64");
    const filename = `${randomUUID()}.${ext}`;

    const dir = join(process.cwd(), "public", "images", "generated");
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, filename), buffer);

    return Response.json({ url: `/images/generated/${filename}` });
  } catch (error) {
    console.error("Upload image error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Upload failed." },
      { status: 500 },
    );
  }
}
