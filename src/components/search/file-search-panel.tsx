"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";

interface FileSearchPanelProps {
  /** Shared by visual-similarity and face search; only the copy differs. */
  mode: "image" | "face";
  previewUrl: string | null;
  onFile: (file: File) => void;
}

export function FileSearchPanel({ mode, previewUrl, onFile }: FileSearchPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        aria-label="Choose a photo"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-hairline-strong bg-surface-2/40 p-6 text-center transition-colors hover:border-amber-500/60 hover:bg-surface-2/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50"
      >
        {previewUrl ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt="Query preview"
              className="max-h-48 rounded-lg border border-hairline object-contain"
            />
            <span className="text-xs text-ink-subtle group-hover:text-foreground">
              Click to choose a different photo
            </span>
          </div>
        ) : (
          <>
            <Upload className="size-6 text-ink-muted transition-colors group-hover:text-amber-500" />
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">
                {mode === "image"
                  ? "Upload a photo to find visually similar posts"
                  : "Upload a portrait to find matching people"}
              </p>
              <p className="text-xs text-ink-subtle">
                {mode === "image"
                  ? "Click to browse (PNG, JPG, WebP)"
                  : "Matches facial structure across all archive posts"}
              </p>
            </div>
          </>
        )}
      </button>
    </>
  );
}
