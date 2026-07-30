"use client";

import { useMutation } from "@tanstack/react-query";
import type { VectorSearchHit } from "@/types";

interface SearchResponse {
  results: VectorSearchHit[];
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
