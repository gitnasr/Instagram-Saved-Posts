import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const allSettings = await prisma.setting.findMany();

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

  await prisma.setting.upsert({
    where: { key },
    create: { key, value, updatedAt: now },
    update: { value, updatedAt: now },
  });

  return NextResponse.json({ success: true });
}
