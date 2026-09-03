"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { PostCard } from "@/components/posts/post-card";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import {
  useSearchByText,
  useSearchByImage,
  useSearchByFace,
  useVectorIndexStatus,
  useReindexVectors,
} from "@/hooks/use-vector-search";
import {
  Search as SearchIcon,
  ImageIcon,
  ScanFace,
  Upload,
  Sparkles,
  RefreshCw,
  Database,
  X,
  AlertCircle,
} from "lucide-react";
import type { Post, VectorSearchHit } from "@/types";

type SearchMode = "text" | "image" | "face";

const EXAMPLE_PROMPTS = [
  "Minimalist architecture",
  "Golden hour sunset",
  "Vintage car aesthetics",
  "Coffee and workspace",
  "Dark moody portrait",
  "Tokyo street photography",
];

export default function SearchPage() {
  const [mode, setMode] = useState<SearchMode>("text");
  const [textQuery, setTextQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<VectorSearchHit[] | null>(null);
  const [activeQueryLabel, setActiveQueryLabel] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchByText = useSearchByText();
  const searchByImage = useSearchByImage();
  const searchByFace = useSearchByFace();
  const { data: indexStatusData, isLoading: isLoadingStatus } = useVectorIndexStatus();
  const reindexMutation = useReindexVectors();

  const isPending =
    searchByText.isPending || searchByImage.isPending || searchByFace.isPending;

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = textQuery.trim();
    if (!query) return;

    setResults(null);
    setActiveQueryLabel(`"${query}"`);
    searchByText.mutate(query, {
      onSuccess: (hits) => setResults(hits),
      onError: (err) => toast.error(err.message),
    });
  };

  const handleFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setResults(null);
    setActiveQueryLabel(file.name);

    if (mode === "image") {
      searchByImage.mutate(file, {
        onSuccess: (hits) => setResults(hits),
        onError: (err) => toast.error(err.message),
      });
    } else {
      searchByFace.mutate(file, {
        onSuccess: (hits) => setResults(hits),
        onError: (err) => toast.error(err.message),
      });
    }
  };

  const handleReindex = () => {
    reindexMutation.mutate(undefined, {
      onSuccess: () => toast.success("Vector indexing initiated in background."),
      onError: (err) => toast.error(err.message),
    });
  };

  const currentIndex = indexStatusData?.current;
  const isIndexRunning = currentIndex?.status === "running";
  const indexProgressPct =
    currentIndex && currentIndex.totalItems > 0
      ? Math.round((currentIndex.indexedItems / currentIndex.totalItems) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="Vector Search"
        description="Semantic, visual similarity, and facial recognition search across saved posts."
      >
        <Button
          variant="outline"
          size="sm"
          onClick={handleReindex}
          disabled={reindexMutation.isPending || isIndexRunning || isLoadingStatus}
          className="gap-1.5"
        >
          <RefreshCw
            className={`size-3.5 ${isIndexRunning || reindexMutation.isPending ? "animate-spin" : ""}`}
          />
          {isIndexRunning ? "Indexing..." : "Reindex Vectors"}
        </Button>
      </Header>

      {/* Database connection warning */}
      {indexStatusData && !indexStatusData.configured && (
        <div className="flex items-center gap-3 rounded-[8px] border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-200">
          <AlertCircle className="size-4 shrink-0 text-amber-500" />
          <div className="flex-1">
            <span className="font-semibold">Qdrant is not connected.</span> Ensure
            Qdrant is running in Docker Compose and <code className="font-mono bg-black/30 px-1 py-0.5 rounded">QDRANT_URL</code> is set.
          </div>
        </div>
      )}

      {/* Index progress banner */}
      {isIndexRunning && currentIndex && (
        <Card className="flex flex-col gap-2 rounded-[8px] border border-hairline bg-surface-1 p-4 text-xs">
          <div className="flex items-center justify-between font-mono">
            <span className="flex items-center gap-1.5 text-foreground">
              <Database className="size-3.5 text-amber-500 animate-pulse" />
              Indexing archive in progress...
            </span>
            <span className="text-ink-subtle">
              {currentIndex.indexedItems} / {currentIndex.totalItems} items ({indexProgressPct}%)
            </span>
          </div>
          <Progress value={indexProgressPct} className="h-1.5 bg-surface-3" />
          <div className="flex justify-between text-[11px] text-ink-subtle font-mono">
            <span>Faces detected: {currentIndex.facesIndexed}</span>
            {currentIndex.failedItems > 0 && (
              <span className="text-red-400">Failures: {currentIndex.failedItems}</span>
            )}
          </div>
        </Card>
      )}

      {/* Search Input Controls */}
      <Card className="flex flex-col gap-4 rounded-[8px] border border-hairline bg-surface-1 p-4 sm:p-6 shadow-xs">
        <Tabs
          value={mode}
          onValueChange={(v) => {
            setMode(v as SearchMode);
            setResults(null);
            setPreviewUrl(null);
            setActiveQueryLabel(null);
          }}
        >
          <TabsList className="mb-2">
            <TabsTrigger value="text" className="gap-1.5">
              <Sparkles className="size-3.5 text-amber-500" />
              Prompt Search
            </TabsTrigger>
            <TabsTrigger value="image" className="gap-1.5">
              <ImageIcon className="size-3.5 text-blue-400" />
              Visual Similarity
            </TabsTrigger>
            <TabsTrigger value="face" className="gap-1.5">
              <ScanFace className="size-3.5 text-purple-400" />
              Face Recognition
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Free-text prompt search */}
          <TabsContent value="text" className="space-y-4">
            <form onSubmit={handleTextSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
                <Input
                  type="text"
                  placeholder="Describe what you want to find (e.g. sunset skyline, architecture sketch, funny cat)..."
                  value={textQuery}
                  onChange={(e) => setTextQuery(e.target.value)}
                  className="pl-9 pr-8 h-10 rounded-[6px] bg-surface-2 border-hairline text-sm"
                />
                {textQuery && (
                  <button
                    type="button"
                    onClick={() => setTextQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-foreground"
                  >
                    <X className="size-3.5" />
                  </button>
                )}
              </div>
              <Button
                type="submit"
                disabled={!textQuery.trim() || isPending}
                className="h-10 px-4 rounded-[6px] gap-1.5"
              >
                <SearchIcon className="size-3.5" />
                Search
              </Button>
            </form>

            <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
              <span className="font-mono text-[11px]">Suggestions:</span>
              {EXAMPLE_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => {
                    setTextQuery(prompt);
                    setResults(null);
                    setActiveQueryLabel(`"${prompt}"`);
                    searchByText.mutate(prompt, {
                      onSuccess: (hits) => setResults(hits),
                      onError: (err) => toast.error(err.message),
                    });
                  }}
                  className="rounded-[4px] border border-hairline bg-surface-2/60 px-2 py-0.5 text-[11px] text-ink-muted hover:border-hairline-strong hover:text-foreground transition-colors font-mono"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </TabsContent>

          {/* Tab 2 & 3: Text-free search (image upload & face recognition) */}
          {(mode === "image" || mode === "face") && (
            <TabsContent value={mode} className="space-y-4">
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

              <div
                onClick={() => fileInputRef.current?.click()}
                className="group flex flex-col items-center justify-center gap-3 rounded-[8px] border-2 border-dashed border-hairline bg-surface-2/40 p-8 text-center transition-all cursor-pointer hover:border-amber-500/60 hover:bg-surface-2/70"
              >
                {previewUrl ? (
                  <div className="relative flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewUrl}
                      alt="Query preview"
                      className="max-h-48 rounded-[6px] object-contain border border-hairline shadow-md"
                    />
                    <span className="text-xs text-ink-subtle font-mono group-hover:text-foreground">
                      Click to choose a different photo
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="rounded-full bg-surface-3/80 p-3 text-ink-muted group-hover:text-amber-500 group-hover:scale-110 transition-transform">
                      <Upload className="size-6" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-sm font-medium text-foreground">
                        {mode === "image"
                          ? "Upload a photo to find visually similar posts"
                          : "Upload a portrait to identify matching people"}
                      </p>
                      <p className="text-xs text-ink-subtle font-mono">
                        {mode === "image"
                          ? "Drag & drop or click to browse (PNG, JPG, WebP)"
                          : "Matches facial structure and geometry across all archive posts"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </Card>

      {/* Loading Skeleton */}
      {isPending && (
        <div className="space-y-3">
          <div className="h-4 w-32 bg-surface-2 rounded animate-pulse" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-[8px]" />
            ))}
          </div>
        </div>
      )}

      {/* Search Results */}
      {!isPending && results && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-hairline pb-2">
            <p className="text-xs font-mono text-ink-muted">
              {results.length === 0 ? (
                <span>No matching posts found {activeQueryLabel && `for ${activeQueryLabel}`}.</span>
              ) : (
                <span>
                  Found <strong className="text-foreground">{results.length}</strong> matching post
                  {results.length === 1 ? "" : "s"} {activeQueryLabel && `for ${activeQueryLabel}`}.
                </span>
              )}
            </p>
          </div>

          {results.length > 0 && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {results.map((hit) => {
                const pct = Math.round(hit.score * 100);
                return (
                  <div key={hit.post.pk} className="relative group">
                    <PostCard post={hit.post} onClick={() => setSelectedPost(hit.post)} />
                    <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1 rounded-[4px] bg-black/80 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-white backdrop-blur-xs border border-white/10">
                      <span className={pct >= 80 ? "text-amber-400" : "text-zinc-300"}>
                        {pct}%
                      </span>
                      <span className="text-[9px] text-zinc-400">match</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
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
