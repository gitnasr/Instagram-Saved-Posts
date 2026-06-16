import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pk: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { pk } = await params;

  const items = await prisma.carouselMedia.findMany({
    where: { profileId: profile.id, postPk: pk },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(items);
}
