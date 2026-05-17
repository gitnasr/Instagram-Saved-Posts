import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pk: string }> }
) {
  const { pk } = await params;

  const items = await prisma.carouselMedia.findMany({
    where: { postPk: pk },
    orderBy: { position: "asc" },
  });

  return NextResponse.json(items);
}
