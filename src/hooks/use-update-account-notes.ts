"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

export function useUpdateAccountNotes(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notes: string) => {
      const res = await fetch(`/api/accounts/${username}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
      });
      if (!res.ok) throw new Error("Failed to update notes");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account", username] });
      queryClient.invalidateQueries({ queryKey: ["accounts"] });
    },
  });
}
