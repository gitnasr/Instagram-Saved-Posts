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
