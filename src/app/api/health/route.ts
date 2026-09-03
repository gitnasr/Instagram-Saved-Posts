import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkQdrantLiveness } from "@/lib/vector/qdrant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  let mongoConnected = false;
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    mongoConnected = true;
  } catch {
    mongoConnected = false;
  }

  const qdrantLiveness = await checkQdrantLiveness().catch(() => ({
    status: "disconnected" as const,
    latencyMs: 0,
  }));

  const isHealthy = mongoConnected && qdrantLiveness.status !== "disconnected";
  const status = isHealthy ? "healthy" : mongoConnected ? "degraded" : "unhealthy";

  return NextResponse.json(
    {
      status,
      mongo: mongoConnected ? "connected" : "disconnected",
      vectorService: {
        status: qdrantLiveness.status,
        latencyMs: qdrantLiveness.latencyMs,
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: mongoConnected ? 200 : 503 }
  );
}
