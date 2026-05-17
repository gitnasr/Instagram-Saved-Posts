"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export interface UpdateAccountPayload {
  lastScrapeOn?: string | null;
  accountStatus?: string | null;
  existsAlso?: string | null;
  newExistsAlsoOption?: string | null;
}

export function useUpdateAccount(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateAccountPayload) => {
      const res = await fetch(`/api/accounts/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => null);
        throw new Error(error?.error ?? "Failed to update account");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", username] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
