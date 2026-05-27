import { headers } from "next/headers";
import { getGroupsFromHeaders, isViewer } from "@/lib/auth";

export async function GET() {
  const h = await headers();
  const groups = getGroupsFromHeaders(h);

  return Response.json({
    username: h.get("x-authentik-username"),
    email: h.get("x-authentik-email"),
    groups,
    isViewer: isViewer(groups),
  });
}
