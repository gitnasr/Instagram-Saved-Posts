import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import type { Prisma } from "@prisma/client";
import {
  EXISTS_ALSO_OPTIONS_SETTING_KEY,
  normalizeDateInput,
  normalizeOptionalText,
  parseReusableExistsAlsoOptions,
} from "@/lib/account-metadata";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { username } = await params;
  const body = await request.json();

  const account = await prisma.account.findFirst({
    where: { profileId: profile.id, username },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const now = new Date().toISOString();
  const updates: Prisma.AccountUpdateInput = {};

  if ("notes" in body) {
    if (body.notes !== null && typeof body.notes !== "string") {
      return NextResponse.json(
        { error: "notes must be a string or null" },
        { status: 400 }
      );
    }

    updates.notes = normalizeOptionalText(body.notes);
  }

  if ("lastScrapeOn" in body) {
    if (body.lastScrapeOn !== null && typeof body.lastScrapeOn !== "string") {
      return NextResponse.json(
        { error: "lastScrapeOn must be a date string or null" },
        { status: 400 }
      );
    }

    if (body.lastScrapeOn === null) {
      updates.lastScrapeOn = null;
    } else {
      const nextLastScrapeOn = normalizeDateInput(body.lastScrapeOn);
      if (!nextLastScrapeOn) {
        return NextResponse.json(
          { error: "lastScrapeOn must use YYYY-MM-DD format" },
          { status: 400 }
        );
      }

      updates.lastScrapeOn = nextLastScrapeOn;
    }
  }

  if ("accountStatus" in body) {
    if (body.accountStatus !== null && typeof body.accountStatus !== "string") {
      return NextResponse.json(
        { error: "accountStatus must be a string or null" },
        { status: 400 }
      );
    }

    const nextStatus = normalizeOptionalText(body.accountStatus);
    updates.accountStatus = nextStatus;
    if (account.accountStatus !== nextStatus) {
      updates.statusChangedAt = nextStatus ? now : null;

      if (nextStatus) {
        await prisma.accountStatusHistory.create({
          data: {
            profileId: profile.id,
            accountPk: account.pk,
            status: nextStatus,
            changedAt: now,
          },
        });
      }
    }
  }

  const existsAlsoSetting = await prisma.setting.findUnique({
    where: { key: EXISTS_ALSO_OPTIONS_SETTING_KEY },
  });
  let reusableExistsAlsoOptions = parseReusableExistsAlsoOptions(
    existsAlsoSetting?.value
  );

  if ("existsAlso" in body || "newExistsAlsoOption" in body) {
    if (
      body.existsAlso !== undefined &&
      body.existsAlso !== null &&
      typeof body.existsAlso !== "string"
    ) {
      return NextResponse.json(
        { error: "existsAlso must be a string or null" },
        { status: 400 }
      );
    }

    if (
      body.newExistsAlsoOption !== undefined &&
      body.newExistsAlsoOption !== null &&
      typeof body.newExistsAlsoOption !== "string"
    ) {
      return NextResponse.json(
        { error: "newExistsAlsoOption must be a string or null" },
        { status: 400 }
      );
    }

    let nextExistsAlso =
      "existsAlso" in body ? normalizeOptionalText(body.existsAlso) : undefined;
    const nextNewExistsAlsoOption = normalizeOptionalText(
      body.newExistsAlsoOption
    );

    if (nextNewExistsAlsoOption) {
      nextExistsAlso = nextNewExistsAlsoOption;
    }

    if (typeof nextExistsAlso !== "undefined") {
      updates.existsAlso = nextExistsAlso;

      if (
        nextExistsAlso &&
        !reusableExistsAlsoOptions.some(
          (option) =>
            option.toLocaleLowerCase() === nextExistsAlso.toLocaleLowerCase()
        )
      ) {
        reusableExistsAlsoOptions = parseReusableExistsAlsoOptions(
          JSON.stringify([...reusableExistsAlsoOptions, nextExistsAlso])
        );
      }
    }
  }

  if (Object.keys(updates).length > 0) {
    await prisma.account.update({
      where: { id: account.id },
      data: updates,
    });
  }

  if ("existsAlso" in body || "newExistsAlsoOption" in body) {
    const value = JSON.stringify(reusableExistsAlsoOptions);
    await prisma.setting.upsert({
      where: { key: EXISTS_ALSO_OPTIONS_SETTING_KEY },
      create: { key: EXISTS_ALSO_OPTIONS_SETTING_KEY, value, updatedAt: now },
      update: { value, updatedAt: now },
    });
  }

  return NextResponse.json({ success: true });
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const profile = await getActiveProfile();
  if (!profile) return noActiveProfileResponse();

  const { username } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "24");
  const offset = (page - 1) * limit;

  const account = await prisma.account.findFirst({
    where: { profileId: profile.id, username },
  });

  if (!account) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const [accountPosts, total, existsAlsoSetting, statusHistory, usernameHistory] =
    await Promise.all([
      prisma.post.findMany({
        where: { profileId: profile.id, accountPk: account.pk },
        orderBy: { takenAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.post.count({
        where: { profileId: profile.id, accountPk: account.pk },
      }),
      prisma.setting.findUnique({
        where: { key: EXISTS_ALSO_OPTIONS_SETTING_KEY },
      }),
      prisma.accountStatusHistory.findMany({
        where: { profileId: profile.id, accountPk: account.pk },
        orderBy: { changedAt: "desc" },
      }),
      prisma.accountUsernameHistory.findMany({
        where: { profileId: profile.id, accountPk: account.pk },
        orderBy: { changedAt: "desc" },
      }),
    ]);

  const existsAlsoOptions = parseReusableExistsAlsoOptions(
    existsAlsoSetting?.value
  );

  return NextResponse.json({
    account,
    existsAlsoOptions,
    statusHistory,
    usernameHistory,
    posts: accountPosts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
