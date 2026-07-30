"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { PostCard } from "@/components/posts/post-card";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import { useSearchByImage, useSearchByFace } from "@/hooks/use-vector-search";
import { ImageIcon, ScanFace, Upload } from "lucide-react";
import type { Post, VectorSearchHit } from "@/types";

type SearchMode = "image" | "face";

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>("image");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<VectorSearchHit[] | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchByImage = useSearchByImage();
  const searchByFace = useSearchByFace();
  const activeSearch = mode === "image" ? searchByImage : searchByFace;

  const handleFile = (file: File) => {
    setPreviewUrl(URL.createObjectURL(file));
    setResults(null);
    activeSearch.mutate(file, {
      onSuccess: (hits) => setResults(hits),
      onError: (error) => toast.error(error.message),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="Search"
        description="Find saved posts by uploading a photo, or find posts containing a specific person."
      />

      <Card className="flex flex-col gap-4 p-4 sm:p-6">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as SearchMode);
            setResults(null);
            setPreviewUrl(null);
          }}
        >
          <TabsList>
            <TabsTrigger value="image">
              <ImageIcon className="mr-1.5 h-4 w-4" />
              By image
            </TabsTrigger>
            <TabsTrigger value="face">
              <ScanFace className="mr-1.5 h-4 w-4" />
              By face
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
        >
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Query"
              className="max-h-40 rounded object-contain"
            />
          ) : (
            <Upload className="h-8 w-8" />
          )}
          <span className="text-sm">
            {mode === "image"
              ? "Upload a photo to find visually similar saved posts"
              : "Upload a photo of a face to find posts with that person"}
          </span>
        </button>
      </Card>

      {activeSearch.isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {!activeSearch.isPending && results && (
        <>
          <p className="text-sm text-muted-foreground">
            {results.length === 0
              ? "No matches found."
              : `${results.length} match${results.length === 1 ? "" : "es"} found.`}
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((hit) => (
              <div key={hit.post.pk} className="relative">
                <PostCard post={hit.post} onClick={() => setSelectedPost(hit.post)} />
                <div className="absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white">
                  {Math.round(hit.score * 100)}% match
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <PostDetailDialog
        post={selectedPost}
        open={!!selectedPost}
        onOpenChange={(open) => {
          if (!open) setSelectedPost(null);
        }}
      />
    </div>
  );
}
