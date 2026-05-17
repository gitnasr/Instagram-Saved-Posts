"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { AccountNote } from "@/types";

export function useAccountNotes(username: string) {
  return useQuery<AccountNote[]>({
    queryKey: ["account-notes", username],
    queryFn: async () => {
      const res = await fetch(`/api/accounts/${username}/notes`);
      if (!res.ok) throw new Error("Failed to fetch notes");
      return res.json();
    },
    enabled: !!username,
    staleTime: 30_000,
  });
}

export function useAddNote(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch(`/api/accounts/${username}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!res.ok) throw new Error("Failed to add note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-notes", username] });
    },
  });
}

export function useDeleteNote(username: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await fetch(`/api/accounts/${username}/notes/${noteId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete note");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["account-notes", username] });
    },
  });
}
