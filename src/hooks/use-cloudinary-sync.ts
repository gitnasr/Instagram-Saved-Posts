"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { CloudinarySyncProgress } from "@/types";

interface SyncStatusResponse {
  current: CloudinarySyncProgress | null;
}

export function useCloudinarySyncStatus() {
  return useQuery<SyncStatusResponse>({
    queryKey: ["cloudinary-sync"],
    queryFn: async () => {
      const res = await fetch("/api/cloudinary-sync");
      if (!res.ok) throw new Error("Failed to fetch sync status");
      return res.json();
    },
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.current?.status === "running" ? 2000 : false;
    },
    staleTime: 5_000,
  });
}

export function useTriggerCloudinarySync() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cloudinary-sync", { method: "POST" });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Failed to start sync");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cloudinary-sync"] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
