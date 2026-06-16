import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "./prisma";
import type { Profile } from "@prisma/client";

export const ACTIVE_PROFILE_COOKIE = "activeProfileId";

/** Read the active profile id from the request cookie (or null). */
export async function getActiveProfileId(): Promise<string | null> {
  const store = await cookies();
  return store.get(ACTIVE_PROFILE_COOKIE)?.value ?? null;
}

/** Load the active Profile, or null when none is selected / it no longer exists. */
export async function getActiveProfile(): Promise<Profile | null> {
  const id = await getActiveProfileId();
  if (!id) return null;
  try {
    return await prisma.profile.findUnique({ where: { id } });
  } catch {
    // Malformed cookie value (not a valid ObjectId) — treat as no profile.
    return null;
  }
}

/** Standard 400 used by API routes when no active profile is selected. */
export function noActiveProfileResponse(): NextResponse {
  return NextResponse.json(
    { error: "No active profile selected. Pick a profile first." },
    { status: 400 }
  );
}
