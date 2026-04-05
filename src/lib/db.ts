import { neon } from "@neondatabase/serverless";

function getDatabaseUrl(): string {
  // Prefer DATABASE_URL, fall back to POSTGRES_URL
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) {
    throw new Error("DATABASE_URL or POSTGRES_URL environment variable is required");
  }

  // Strip channel_binding param — not supported by the HTTP driver
  try {
    const url = new URL(raw);
    url.searchParams.delete("channel_binding");
    return url.toString();
  } catch {
    return raw;
  }
}

export const sql = neon(getDatabaseUrl());
