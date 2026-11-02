/**
 * Turning a thrown request error into the two fields persisted on a
 * `ScrapeRun` row. Classification itself lives in `instagram-api`.
 */

import { isAxiosError, ScrapeRequestError } from "../instagram-api";

/** Extract error message + optional JSON-stringified API response body */
export function extractErrorInfo(error: unknown): {
  errorMsg: string;
  errorBody: string | null;
} {
  const errorMsg = error instanceof Error ? error.message : "Unknown error";

  // A failure reported with a 2xx has no axios error to read the body from.
  if (error instanceof ScrapeRequestError && error.body) {
    return { errorMsg, errorBody: error.body };
  }

  // Page errors arrive wrapped by `fetchSavedPostsPage`, so the axios error
  // holding Instagram's response body is one level down.
  const cause =
    typeof error === "object" && error !== null && "cause" in error
      ? (error as { cause?: unknown }).cause
      : undefined;
  const axiosLike = isAxiosError(error)
    ? error
    : isAxiosError(cause)
      ? cause
      : null;

  let errorBody: string | null = null;
  if (axiosLike?.response?.data) {
    try {
      errorBody = JSON.stringify(axiosLike.response.data, null, 2);
    } catch {
      errorBody = String(axiosLike.response.data);
    }
  }
  return { errorMsg, errorBody };
}
