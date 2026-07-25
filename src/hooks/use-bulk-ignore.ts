"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface BulkIgnorePayload {
  pks: string[];
  ignored: boolean;
}

export function useBulkIgnore() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: BulkIgnorePayload) => {
      const res = await fetch("/api/accounts/bulk-ignore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error ?? "Failed to update accounts");
      }

      return res.json() as Promise<{ success: true; updated: number }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
      queryClient.invalidateQueries({ queryKey: ["account"] });
    },
  });
}
