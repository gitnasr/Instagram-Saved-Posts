"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { UpdatesResponse } from "@/lib/updates";

export type { UpdatesResponse, ReleaseInfo, UpgradeLevel } from "@/lib/updates";

async function fetchUpdates(refresh = false): Promise<UpdatesResponse> {
  const res = await fetch(refresh ? "/api/updates?refresh=1" : "/api/updates");
  if (!res.ok) throw new Error("Failed to check for updates");
  return res.json();
}

export function useUpdates() {
  const qc = useQueryClient();
  const query = useQuery<UpdatesResponse>({
    queryKey: ["updates"],
    queryFn: () => fetchUpdates(),
    staleTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  /** Ask the server to bypass its cache (rate-limited server-side). */
  const checkNow = () =>
    qc.fetchQuery({ queryKey: ["updates"], queryFn: () => fetchUpdates(true), staleTime: 0 });

  return { ...query, checkNow };
}
