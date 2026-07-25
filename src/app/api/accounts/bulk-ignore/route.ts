import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import { recordBulkAccountEvents } from "@/lib/account-events";

const MAX_PKS = 500;

export async function POST(request: Request) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const body = await request.json();

  if (typeof body.ignored !== "boolean") {
    return NextResponse.json(
      { error: "ignored must be a boolean" },
      { status: 400 }
    );
  }

  if (
    !Array.isArray(body.pks) ||
    body.pks.some((pk: unknown) => typeof pk !== "string")
  ) {
    return NextResponse.json(
      { error: "pks must be an array of strings" },
      { status: 400 }
    );
  }

  const pks: string[] = [...new Set<string>(body.pks)];

  if (pks.length === 0) {
    return NextResponse.json({ success: true, updated: 0 });
  }

  if (pks.length > MAX_PKS) {
    return NextResponse.json(
      { error: `Cannot update more than ${MAX_PKS} accounts at once` },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();

  // Only accounts actually changing state get a timeline entry, so repeatedly
  // ignoring an already-ignored account does not spam the timeline.
  const changingPks = (
    await prisma.account.findMany({
      where: {
        profileId: profile.id,
        pk: { in: pks },
        ...(body.ignored
          ? { OR: [{ ignoredAt: null }, { ignoredAt: { isSet: false } }] }
          : { ignoredAt: { not: null } }),
      },
      select: { pk: true },
    })
  ).map((account) => account.pk);

  const result = await prisma.account.updateMany({
    where: { profileId: profile.id, pk: { in: pks } },
    data: { ignoredAt: body.ignored ? now : null },
  });

  await recordBulkAccountEvents(
    profile.id,
    changingPks,
    body.ignored ? "ignored" : "unignored",
    now
  );

  return NextResponse.json({ success: true, updated: result.count });
}
