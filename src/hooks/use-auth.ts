"use client";

import { useQuery } from "@tanstack/react-query";

interface UserProfile {
  username: string | null;
  email: string | null;
  groups: string[];
  isViewer: boolean;
}

export function useAuth() {
  return useQuery<UserProfile>({
    queryKey: ["auth-me"],
    queryFn: async () => {
      const res = await fetch("/api/auth/me");
      if (!res.ok) throw new Error("Failed to fetch auth info");
      return res.json();
    },
  });
}
