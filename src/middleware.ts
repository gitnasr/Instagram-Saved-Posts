import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getGroupsFromHeaders, isViewer } from "./lib/auth";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // We only protect specific API routes that perform write operations
  const isRestrictedApiRoute =
    pathname.startsWith("/api/scrape") ||
    pathname.startsWith("/api/settings") ||
    pathname.startsWith("/api/cloudinary-sync");

  const isWriteMethod = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);

  if (isRestrictedApiRoute && isWriteMethod) {
    const groups = getGroupsFromHeaders(request.headers);
    if (isViewer(groups)) {
      return new NextResponse(
        JSON.stringify({
          error: "Forbidden: Viewers are not allowed to perform this operation.",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/scrape/:path*",
    "/api/settings/:path*",
    "/api/cloudinary-sync/:path*",
  ],
};
