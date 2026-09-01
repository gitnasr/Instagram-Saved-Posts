import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface CloudinaryStats {
  plan: string;
  storageUsed: number;
  storageLimit: number;
  resources: number;
  bandwidthUsed: number;
  bandwidthLimit: number;
  transformations: number;
}

export interface CloudinaryConfigResponse {
  configured: boolean;
  cloudName: string;
  apiKey: string;
  stats: CloudinaryStats | null;
  statsError?: string;
}

async function fetchCloudinaryConfig(): Promise<CloudinaryConfigResponse> {
  const res = await fetch("/api/cloudinary-config");
  if (!res.ok) throw new Error("Failed to load Cloudinary configuration");
  return res.json();
}

export function useCloudinaryConfig() {
  return useQuery<CloudinaryConfigResponse>({
    queryKey: ["cloudinary-config"],
    queryFn: fetchCloudinaryConfig,
    staleTime: 60_000,
  });
}

export interface SaveCloudinaryConfigPayload {
  cloudName: string;
  apiKey: string;
  apiSecret: string;
}

export function useSaveCloudinaryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SaveCloudinaryConfigPayload) => {
      const res = await fetch("/api/cloudinary-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to save Cloudinary configuration");
      return data as { ok: boolean; stats: CloudinaryStats };
    },
    onSuccess: () => {
      toast.success("Cloudinary credentials saved and verified!");
      qc.invalidateQueries({ queryKey: ["cloudinary-config"] });
      qc.invalidateQueries({ queryKey: ["cloudinary-sync-status"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}

export function useDeleteCloudinaryConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/cloudinary-config", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove Cloudinary configuration");
    },
    onSuccess: () => {
      toast.success("Cloudinary credentials removed");
      qc.invalidateQueries({ queryKey: ["cloudinary-config"] });
      qc.invalidateQueries({ queryKey: ["cloudinary-sync-status"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
}
