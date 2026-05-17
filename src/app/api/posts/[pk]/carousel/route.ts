import { NextResponse } from "next/server";
import { db } from "@/db";
import { carouselMedia } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pk: string }> }
) {
  const { pk } = await params;

  const items = db
    .select()
    .from(carouselMedia)
    .where(eq(carouselMedia.postPk, pk))
    .orderBy(asc(carouselMedia.position))
    .all();

  return NextResponse.json(items);
}
