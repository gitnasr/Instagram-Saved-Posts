import { NextResponse } from "next/server";
import { getActiveProfile } from "@/lib/active-profile";
import { checkQdrantLiveness } from "@/lib/vector/qdrant-client";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getActiveProfile();
  const liveness = await checkQdrantLiveness(profile?.id);

  const httpStatus = liveness.status === "disconnected" ? 503 : 200;
  return NextResponse.json(liveness, { status: httpStatus });
}
