import type { InstagramSavedResponse } from "@/types/instagram";
import {
  DEFAULT_USER_AGENT,
  INSTAGRAM_SAVED_POSTS_URL,
  DEFAULT_PAGE_COUNT,
} from "./constants";
import axios from "axios";

export interface FetchPageOptions {
  cookie: string;
  userAgent?: string;
  maxId?: string;
  count?: number;
}

export async function fetchSavedPostsPage(
  options: FetchPageOptions
): Promise<InstagramSavedResponse> {
  const {
    cookie,
    userAgent = DEFAULT_USER_AGENT,
    maxId,
    count = DEFAULT_PAGE_COUNT,
  } = options;

  const url = new URL(INSTAGRAM_SAVED_POSTS_URL);
  url.searchParams.set("count", String(count));
  url.searchParams.set("include_feed_only", "false");
  if (maxId) {
    url.searchParams.set("max_id", maxId);
  }

  const response = await axios.get(url.toString(), {
    headers: {
      "User-Agent": userAgent,
      Cookie: cookie,
    },
  });

  if (response.status !== 200) {
    console.log("Response body:", response.data);
    throw new Error(
      `Instagram API error: ${response.status} ${response.statusText}`
    );
  }

  const data: InstagramSavedResponse = response.data;

  if (data.status !== "ok") {
    throw new Error(`Instagram API returned status: ${data.status}`);
  }

  return data;
}

export interface LoggedInUser {
  pk: string;
  username: string;
  profilePicUrl: string | null;
}

/**
 * Best-effort fetch of the logged-in account behind a cookie (used to
 * auto-fill a profile's avatar). Parses `ds_user_id` from the cookie and
 * calls the user-info endpoint. Returns null on any failure.
 */
export async function fetchLoggedInUser(
  cookie: string,
  userAgent: string = DEFAULT_USER_AGENT
): Promise<LoggedInUser | null> {
  const match = cookie.match(/ds_user_id=(\d+)/);
  if (!match) return null;
  const userId = match[1];

  try {
    const response = await axios.get(
      `https://i.instagram.com/api/v1/users/${userId}/info/`,
      { headers: { "User-Agent": userAgent, Cookie: cookie } }
    );
    const user = response.data?.user;
    if (!user) return null;
    return {
      pk: String(user.pk ?? userId),
      username: user.username ?? "",
      profilePicUrl: user.profile_pic_url ?? null,
    };
  } catch {
    return null;
  }
}
