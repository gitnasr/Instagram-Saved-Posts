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

export interface VectorStatsResponse {
  activeProfile: VectorIndexStats | null;
  allProfiles: VectorIndexStats[];
  totalProfilesIndexed: number;
  qdrant: {
    configured: boolean;
    dashboardUrl: string;
    profilePoints: {
      images: number;
      faces: number;
      total: number;
    };
  };
}

async function postImage(url: string, file: File): Promise<VectorSearchHit[]> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(url, { method: "POST", body: formData });
  const body: SearchResponse = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new VectorSearchError(body.error ?? `Search failed (${res.status})`, !!body.needsIndexing);
  }
  return body.results ?? [];
}

async function postText(query: string): Promise<VectorSearchHit[]> {
  const res = await fetch("/api/search/by-text", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const body: SearchResponse = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new VectorSearchError(body.error ?? `Search failed (${res.status})`, !!body.needsIndexing);
  }
  return body.results ?? [];
}

export function useSearchByText() {
  return useMutation<VectorSearchHit[], VectorSearchError, string>({
    mutationFn: (query: string) => postText(query),
  });
}

export function useSearchByImage() {
  return useMutation<VectorSearchHit[], VectorSearchError, File>({
    mutationFn: (file: File) => postImage("/api/search/by-image", file),
  });
}

export function useSearchByFace() {
  return useMutation<VectorSearchHit[], VectorSearchError, File>({
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
      return status === "running" ? 2000 : 15000;
    },
  });
}

export function useVectorStats() {
  return useQuery<VectorStatsResponse>({
    queryKey: ["vector-stats"],
    queryFn: async () => {
      const res = await fetch("/api/search/stats");
      if (!res.ok) throw new Error("Failed to fetch vector stats");
      return res.json();
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
      queryClient.invalidateQueries({ queryKey: ["vector-stats"] });
    },
  });
}
