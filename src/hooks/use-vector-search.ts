"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { VectorSearchHit, VectorIndexProgress } from "@/types";
import type { VectorIndexStats } from "@/lib/vector/stats";
import type { QdrantLivenessResult } from "@/lib/vector/qdrant-client";

export class VectorSearchError extends Error {
  needsIndexing: boolean;
  constructor(message: string, needsIndexing = false) {
    super(message);
    this.name = "VectorSearchError";
    this.needsIndexing = needsIndexing;
  }
}

interface SearchResponse {
  results?: VectorSearchHit[];
  error?: string;
  needsIndexing?: boolean;
}

export interface ReindexStatusResponse {
  current: VectorIndexProgress | null;
  configured: boolean;
  stats: VectorIndexStats | null;
  liveness: QdrantLivenessResult | null;
  error?: string;
}

async function search(url: string, init: RequestInit): Promise<VectorSearchHit[]> {
  const res = await fetch(url, { method: "POST", ...init });
  const body: SearchResponse = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new VectorSearchError(body.error ?? `Search failed (${res.status})`, !!body.needsIndexing);
  }
  return body.results ?? [];
}

function searchByUpload(url: string) {
  return (file: File) => {
    const formData = new FormData();
    formData.append("image", file);
    return search(url, { body: formData });
  };
}

export function useSearchByText() {
  return useMutation<VectorSearchHit[], VectorSearchError, string>({
    mutationFn: (query) =>
      search("/api/search/by-text", {
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      }),
  });
}

export function useSearchByImage() {
  return useMutation<VectorSearchHit[], VectorSearchError, File>({
    mutationFn: searchByUpload("/api/search/by-image"),
  });
}

export function useSearchByFace() {
  return useMutation<VectorSearchHit[], VectorSearchError, File>({
    mutationFn: searchByUpload("/api/search/by-face"),
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
    refetchInterval: (query) =>
      query.state.data?.current?.status === "running" ? 2000 : 15000,
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
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vector-index-status"] }),
  });
}
