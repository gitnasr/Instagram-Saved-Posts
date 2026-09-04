import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  checkQdrantLiveness,
  getQdrantConfig,
  isQdrantConfigured,
} from "@/lib/vector/qdrant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  let mongoConnected = false;
  try {
    await prisma.$runCommandRaw({ ping: 1 });
    mongoConnected = true;
  } catch {
    mongoConnected = false;
  }

  // Vector search is opt-in. With QDRANT_URL unset the feature is simply off,
  // which is a valid deployment — not a degraded one. Reporting it as degraded
  // would fail the container HEALTHCHECK for every install that skipped search.
  const searchEnabled = isQdrantConfigured(getQdrantConfig());
  const qdrantLiveness = searchEnabled
    ? await checkQdrantLiveness().catch(() => ({
        status: "disconnected" as const,
        latencyMs: 0,
      }))
    : null;

  const isHealthy =
    mongoConnected && (!searchEnabled || qdrantLiveness?.status === "healthy");
  const status = isHealthy ? "healthy" : mongoConnected ? "degraded" : "unhealthy";

  return NextResponse.json(
    {
      status,
      mongo: mongoConnected ? "connected" : "disconnected",
      vectorService: qdrantLiveness
        ? { status: qdrantLiveness.status, latencyMs: qdrantLiveness.latencyMs }
        : { status: "disabled" },
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    },
    { status: isHealthy ? 200 : 503 }
  );
}
