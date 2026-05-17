import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  let mongoConnected = false;
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    mongoConnected = true;
  } catch {
    mongoConnected = false;
  }

  const status = mongoConnected ? "healthy" : "degraded";

  return NextResponse.json(
    {
      status,
      mongo: mongoConnected ? "connected" : "disconnected",
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: mongoConnected ? 200 : 503 }
  );
}
