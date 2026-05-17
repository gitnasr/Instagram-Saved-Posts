import { NextResponse } from "next/server";

// Only allow proxying from these domains to prevent open-proxy abuse
const ALLOWED_DOMAINS = [
  "instagram.com",
  "cdninstagram.com",
  "fbcdn.net",
  "fbsbx.com",
  "scontent.cdninstagram.com",
];

function isAllowedDomain(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return ALLOWED_DOMAINS.some(
      (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get("url");

  if (!imageUrl) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  if (!isAllowedDomain(imageUrl)) {
    return NextResponse.json(
      { error: "Domain not allowed" },
      { status: 403 }
    );
  }

  try {
    const response = await fetch(imageUrl, {
      headers: {
        // Mimic a browser request to avoid CDN blocks
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://www.instagram.com/",
      },
      // 10 second timeout
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      return new NextResponse(null, { status: response.status });
    }

    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        // Cache for 1 hour in browser, 24 hours on CDN
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch image" },
      { status: 502 }
    );
  }
}
