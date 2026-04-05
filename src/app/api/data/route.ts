import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { seedContentHubData } from "@/lib/seed-data";
import type { ContentHubData } from "@/lib/types";

export const runtime = "nodejs";

const isVercel = !!process.env.VERCEL;
const dataDirectory = isVercel
  ? path.join("/tmp", "content-hub-data")
  : path.join(process.cwd(), "data");
const dataFilePath = path.join(dataDirectory, "content-hub.json");

function getDefaultData(): ContentHubData {
  return structuredClone(seedContentHubData);
}

function mergeWithDefaults(data: ContentHubData): ContentHubData {
  const defaults = getDefaultData();

  return {
    ...defaults,
    ...data,
    settings: {
      ...defaults.settings,
      ...data.settings,
      postingSchedule: {
        ...defaults.settings.postingSchedule,
        ...data.settings?.postingSchedule,
      },
    },
  };
}

function isContentHubData(value: unknown): value is ContentHubData {
  if (!value || typeof value !== "object") {
    return false;
  }

  const data = value as Partial<ContentHubData>;
  return (
    Array.isArray(data.ideas) &&
    Array.isArray(data.posts) &&
    Array.isArray(data.analytics) &&
    typeof data.settings === "object" &&
    data.settings !== null
  );
}

async function ensureDataDirectory() {
  await mkdir(dataDirectory, { recursive: true });
}

async function writeDataFile(data: ContentHubData) {
  await ensureDataDirectory();
  await writeFile(dataFilePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

async function readOrCreateDataFile() {
  try {
    const fileContents = await readFile(dataFilePath, "utf8");
    const parsed = JSON.parse(fileContents) as unknown;

    if (!isContentHubData(parsed)) {
      throw new Error("Data file does not match the expected ContentHubData shape.");
    }

    return mergeWithDefaults(parsed);
  } catch (error) {
    const isMissingFile =
      error instanceof Error && "code" in error && error.code === "ENOENT";

    if (!isMissingFile) {
      throw error;
    }

    const seedData = getDefaultData();
    await writeDataFile(seedData);
    return seedData;
  }
}

export async function GET() {
  try {
    const data = await readOrCreateDataFile();
    return Response.json(data);
  } catch (error) {
    console.error("Failed to read content hub data:", error);
    return Response.json(
      { error: "Failed to load content hub data." },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  try {
    const payload = (await request.json()) as unknown;

    if (!isContentHubData(payload)) {
      return Response.json(
        { error: "Invalid ContentHubData payload." },
        { status: 400 },
      );
    }

    const data = mergeWithDefaults(payload);
    await writeDataFile(data);

    return Response.json(data);
  } catch (error) {
    const isJsonParseError = error instanceof SyntaxError;

    if (isJsonParseError) {
      return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
    }

    console.error("Failed to write content hub data:", error);
    return Response.json(
      { error: "Failed to save content hub data." },
      { status: 500 },
    );
  }
}
