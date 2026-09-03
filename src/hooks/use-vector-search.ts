"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VectorSearchHit, VectorIndexProgress } from "@/types";

interface SearchResponse {
  results: VectorSearchHit[];
  error?: string;
}

interface ReindexStatusResponse {
  current: VectorIndexProgress | null;
  configured: boolean;
  error?: string;
}

async function postImage(url: string, file: File): Promise<VectorSearchHit[]> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(url, { method: "POST", body: formData });
  const body: SearchResponse = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Search failed");
  return body.results;
}

async function postText(query: string): Promise<VectorSearchHit[]> {
  const res = await fetch("/api/search/by-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body: SearchResponse = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Search failed");
  return body.results;
}

export function useSearchByText() {
  return useMutation({
    mutationFn: (query: string) => postText(query),
  });
}

export function useSearchByImage() {
  return useMutation({
    mutationFn: (file: File) => postImage("/api/search/by-image", file),
  });
}

export function useSearchByFace() {
  return useMutation({
    mutationFn: (file: File) => postImage("/api/search/by-face", file),
  });
}

export function useVectorIndexStatus() {
  return useQuery<ReindexStatusResponse>({
    queryKey: ["vector-index-status"],
    queryFn: async () => {
      const res = await fetch("/api/search/reindex");
      if (!res.ok) throw new Error("Failed to fetch vector index status");
      return res.json();
    },
    refetchInterval: (query) => {
      const status = query.state.data?.current?.status;
      return status === "running" ? 2000 : false;
    },
  });
}

export function useReindexVectors() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/search/reindex", { method: "POST" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to start indexing");
      return body;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vector-index-status"] });
    },
  });
}
