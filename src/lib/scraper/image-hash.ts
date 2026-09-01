/**
 * Content hashing for avatar images. A changed hash is how the scraper knows
 * to null out the Cloudinary URL so the sync re-uploads the new picture.
 */

import { createHash } from "crypto";
import {
  PROFILE_PIC_FETCH_TIMEOUT_MS,
  PROFILE_PIC_FETCH_USER_AGENT,
} from "../constants";

/** Fetch image bytes and compute SHA-256 hash. Returns null on failure. */
export async function hashImageUrl(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": PROFILE_PIC_FETCH_USER_AGENT,
        Referer: "https://www.instagram.com/",
      },
      signal: AbortSignal.timeout(PROFILE_PIC_FETCH_TIMEOUT_MS),
    });
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return createHash("sha256").update(Buffer.from(buffer)).digest("hex");
  } catch {
    return null;
  }
}
