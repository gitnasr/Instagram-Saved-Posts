export function getGroupsFromHeaders(headersList: { get: (name: string) => string | null }): string[] {
  const groupsHeader = headersList.get("x-authentik-groups") || "";
  if (!groupsHeader) return [];
  // Groups from Authentik are typically comma-separated.
  return groupsHeader.split(",").map((g) => g.trim());
}

export function isViewer(groups: string[]): boolean {
  return groups.some((g) => {
    const lower = g.toLowerCase();
    return lower === "viewer" || lower === "viewers";
  });
}
