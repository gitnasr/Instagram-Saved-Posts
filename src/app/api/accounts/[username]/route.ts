import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveProfile, noActiveProfileResponse } from "@/lib/active-profile";
import type { Prisma } from "@prisma/client";
import {
  ACCOUNT_STATUS_OPTIONS,
  ACCOUNT_STATUS_OPTIONS_SETTING_KEY,
  EXISTS_ALSO_OPTIONS_SETTING_KEY,
  findMatchingTextOption,
  mergeStatusOptions,
  normalizeDateInput,
  normalizeOptionalText,
  parseReusableExistsAlsoOptions,
  parseReusableStatusOptions,
} from "@/lib/account-metadata";
import {
  accountEventsQuery,
  recordAccountEvents,
  type AccountEventDraft,
} from "@/lib/account-events";
import { backfillRecoveredAccountStatusIfNeeded } from "@/lib/scraper/lost-state";

const ACCOUNT_EVENTS_LIMIT = 200;

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
  const events: AccountEventDraft[] = [];

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

  const statusOptionsSetting =
    "accountStatus" in body
      ? await prisma.setting.findUnique({
          where: { key: ACCOUNT_STATUS_OPTIONS_SETTING_KEY },
        })
      : null;
  let reusableStatusOptions = parseReusableStatusOptions(
    statusOptionsSetting?.value
  );

  if ("accountStatus" in body) {
    if (body.accountStatus !== null && typeof body.accountStatus !== "string") {
      return NextResponse.json(
        { error: "accountStatus must be a string or null" },
        { status: 400 }
      );
    }

    const rawNextStatus = normalizeOptionalText(body.accountStatus);
    const knownStatusOptions = mergeStatusOptions(
      ACCOUNT_STATUS_OPTIONS,
      reusableStatusOptions
    );
    const nextStatus = rawNextStatus
      ? (findMatchingTextOption(knownStatusOptions, rawNextStatus) ??
        rawNextStatus)
      : null;

    updates.accountStatus = nextStatus;

    if (
      nextStatus &&
      !findMatchingTextOption(ACCOUNT_STATUS_OPTIONS, nextStatus) &&
      !findMatchingTextOption(reusableStatusOptions, nextStatus)
    ) {
      reusableStatusOptions = parseReusableStatusOptions(
        JSON.stringify([...reusableStatusOptions, nextStatus])
      );
    }

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

      events.push({
        type: "status_changed",
        occurredAt: now,
        fromValue: account.accountStatus,
        toValue: nextStatus,
      });
    }
  }

  if ("ignored" in body) {
    if (typeof body.ignored !== "boolean") {
      return NextResponse.json(
        { error: "ignored must be a boolean" },
        { status: 400 }
      );
    }

    const wasIgnored = account.ignoredAt != null;
    if (wasIgnored !== body.ignored) {
      updates.ignoredAt = body.ignored ? now : null;
      events.push({
        type: body.ignored ? "ignored" : "unignored",
        occurredAt: now,
      });
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

  await recordAccountEvents(profile.id, account.pk, events);

  if ("accountStatus" in body) {
    const value = JSON.stringify(reusableStatusOptions);
    await prisma.setting.upsert({
      where: { key: ACCOUNT_STATUS_OPTIONS_SETTING_KEY },
      create: { key: ACCOUNT_STATUS_OPTIONS_SETTING_KEY, value, updatedAt: now },
      update: { value, updatedAt: now },
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

  await backfillRecoveredAccountStatusIfNeeded(profile.id);

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

  const [
    accountPosts,
    total,
    statusOptionsSetting,
    distinctAccountStatuses,
    distinctHistoryStatuses,
    existsAlsoSetting,
    statusHistory,
    usernameHistory,
    events,
    latestPost,
  ] = await Promise.all([
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
      where: { key: ACCOUNT_STATUS_OPTIONS_SETTING_KEY },
    }),
    prisma.account.groupBy({
      by: ["accountStatus"],
      where: { profileId: profile.id, accountStatus: { not: null } },
    }),
    prisma.accountStatusHistory.groupBy({
      by: ["status"],
      where: { profileId: profile.id },
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
    prisma.accountEvent.findMany(
      accountEventsQuery(profile.id, account.pk, ACCOUNT_EVENTS_LIMIT)
    ),
    prisma.post.aggregate({
      where: { profileId: profile.id, accountPk: account.pk },
      _max: { takenAt: true },
    }),
  ]);

  const statusOptions = mergeStatusOptions(
    ACCOUNT_STATUS_OPTIONS,
    parseReusableStatusOptions(statusOptionsSetting?.value),
    distinctAccountStatuses
      .map((row) => row.accountStatus)
      .filter((value): value is string => typeof value === "string"),
    distinctHistoryStatuses
      .map((row) => row.status)
      .filter((value): value is string => typeof value === "string")
  );

  const existsAlsoOptions = parseReusableExistsAlsoOptions(
    existsAlsoSetting?.value
  );

  return NextResponse.json({
    account,
    statusOptions,
    existsAlsoOptions,
    statusHistory,
    usernameHistory,
    events,
    eventsLimit: ACCOUNT_EVENTS_LIMIT,
    // Newest post we have saved for this account — the real IG feed is never
    // fetched, so this is the best "last post" signal available.
    latestPostTakenAt: latestPost._max.takenAt ?? null,
    posts: accountPosts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
