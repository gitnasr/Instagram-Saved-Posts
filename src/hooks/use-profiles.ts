"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ProfilePublic } from "@/types";

async function readError(res: Response, fallback: string): Promise<string> {
  const body = await res.json().catch(() => ({}));
  return body?.error ?? fallback;
}

export function useProfiles() {
  return useQuery<ProfilePublic[]>({
    queryKey: ["profiles"],
    queryFn: async () => {
      const res = await fetch("/api/profiles");
      if (!res.ok) throw new Error("Failed to fetch profiles");
      return res.json();
    },
  });
}

export function useCreateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      name: string;
      cookie?: string;
      userAgent?: string;
    }) => {
      const res = await fetch("/api/profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to create profile"));
      return res.json() as Promise<ProfilePublic>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: {
      id: string;
      name?: string;
      cookie?: string;
      userAgent?: string;
      avatarUrl?: string | null;
    }) => {
      const res = await fetch(`/api/profiles/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to update profile"));
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useDeleteProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/profiles/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(await readError(res, "Failed to delete profile"));
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["profiles"] }),
  });
}

export function useSelectProfile() {
  return useMutation({
    mutationFn: async (profileId: string) => {
      const res = await fetch("/api/profiles/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profileId }),
      });
      if (!res.ok) throw new Error(await readError(res, "Failed to select profile"));
      return res.json();
    },
  });
}
