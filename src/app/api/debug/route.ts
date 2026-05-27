import { headers } from "next/headers"

export async function GET() {
  const h = await headers()

  return Response.json({
    username: h.get("x-authentik-username"),
    email: h.get("x-authentik-email"),
    groups: h.get("x-authentik-groups"),
  })
}