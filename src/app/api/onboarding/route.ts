import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const SETTING_KEY = "onboardingCompleted";

/**
 * GET /api/onboarding
 * Returns whether onboarding has been completed.
 */
export async function GET() {
  try {
    const setting = await prisma.setting.findUnique({
      where: { key: SETTING_KEY },
    });
    return NextResponse.json({ completed: setting?.value === "true" });
  } catch {
    // If DB is unreachable, assume not completed
    return NextResponse.json({ completed: false });
  }
}

/**
 * POST /api/onboarding
 * Marks onboarding as completed.
 */
export async function POST() {
  try {
    const now = new Date().toISOString();
    await prisma.setting.upsert({
      where: { key: SETTING_KEY },
      update: { value: "true", updatedAt: now },
      create: { key: SETTING_KEY, value: "true", updatedAt: now },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
