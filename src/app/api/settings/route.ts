import { NextResponse } from "next/server";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  const allSettings = db.select().from(settings).all();

  const masked = allSettings.map((s) => ({
    ...s,
    value:
      s.key === "instagram_cookie" && s.value.length > 20
        ? s.value.substring(0, 20) + "..."
        : s.value,
  }));

  return NextResponse.json(masked);
}

export async function PUT(request: Request) {
  const body = await request.json();
  const { key, value } = body;

  if (!key || typeof value !== "string") {
    return NextResponse.json(
      { error: "key and value are required" },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  db.insert(settings)
    .values({ key, value, updatedAt: now })
    .onConflictDoUpdate({
      target: settings.key,
      set: { value, updatedAt: now },
    })
    .run();

  return NextResponse.json({ success: true });
}
