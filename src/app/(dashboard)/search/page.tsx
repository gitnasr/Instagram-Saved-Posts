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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PostCard } from "@/components/posts/post-card";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import {
  useSearchByText,
  useSearchByImage,
  useSearchByFace,
  useVectorIndexStatus,
  useVectorStats,
  useReindexVectors,
  type VectorSearchError,
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
  ExternalLink,
  BarChart3,
  Clock,
  Calendar,
  Layers,
  Activity,
  CheckCircle2,
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
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [searchErrorMessage, setSearchErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const searchByText = useSearchByText();
  const searchByImage = useSearchByImage();
  const searchByFace = useSearchByFace();
  const { data: indexStatusData, isLoading: isLoadingStatus } = useVectorIndexStatus();
  const { data: vectorStatsData, isLoading: isLoadingStats } = useVectorStats();
  const reindexMutation = useReindexVectors();

  const isPending =
    searchByText.isPending || searchByImage.isPending || searchByFace.isPending;

  const handleSearchError = (err: VectorSearchError | Error) => {
    const isIndexNeeded = "needsIndexing" in err ? err.needsIndexing : false;
    if (isIndexNeeded) {
      setShowIndexModal(true);
      setSearchErrorMessage("Vector index has not been built yet. Please run the indexer first.");
    } else {
      setSearchErrorMessage(err.message);
      toast.error(err.message);
    }
  };

  const handleTextSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = textQuery.trim();
    if (!query) return;

    setResults(null);
    setSearchErrorMessage(null);
    setActiveQueryLabel(`"${query}"`);
    searchByText.mutate(query, {
      onSuccess: (hits) => setResults(hits),
      onError: (err) => handleSearchError(err),
    });
  };

  const handleFile = (file: File) => {
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
    setResults(null);
    setSearchErrorMessage(null);
    setActiveQueryLabel(file.name);

    if (mode === "image") {
      searchByImage.mutate(file, {
        onSuccess: (hits) => setResults(hits),
        onError: (err) => handleSearchError(err),
      });
    } else {
      searchByFace.mutate(file, {
        onSuccess: (hits) => setResults(hits),
        onError: (err) => handleSearchError(err),
      });
    }
  };

  const handleReindex = () => {
    setShowIndexModal(false);
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

  const liveness = indexStatusData?.liveness;
  const stats = indexStatusData?.stats;
  const dashboardUrl = liveness?.dashboardUrl ?? "http://localhost:6335/dashboard";
  const hasNeverIndexed = !isIndexRunning && (!stats || stats.indexedItems === 0);

  return (
    <div className="flex flex-col gap-6">
      <Header
        title="Vector Search"
        description="Semantic natural-language prompts, visual similarity, and facial recognition search across your archive."
      >
        <div className="flex flex-wrap items-center gap-2">
          {/* Qdrant Liveness Badge */}
          {liveness && (
            <div
              className={`flex items-center gap-1.5 rounded-[4px] border px-2 py-1 text-[11px] font-mono ${
                liveness.status === "healthy"
                  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                  : liveness.status === "degraded"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
              }`}
            >
              <div
                className={`size-1.5 rounded-full ${
                  liveness.status === "healthy"
                    ? "bg-emerald-400 animate-pulse"
                    : liveness.status === "degraded"
                      ? "bg-amber-400"
                      : "bg-red-400"
                }`}
              />
              <span>
                {liveness.status === "healthy"
                  ? `Qdrant (${liveness.latencyMs}ms)`
                  : liveness.status === "degraded"
                    ? "Qdrant (Empty)"
                    : "Qdrant Offline"}
              </span>
            </div>
          )}

          {/* Statistics Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatsModal(true)}
            className="gap-1.5 text-xs font-mono"
          >
            <BarChart3 className="size-3.5 text-amber-500" />
            Statistics
          </Button>

          {/* Qdrant Dashboard Link */}
          <Button
            asChild
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs font-mono"
          >
            <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="size-3.5 text-blue-400" />
              Qdrant UI
            </a>
          </Button>

          {/* Reindex Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleReindex}
            disabled={reindexMutation.isPending || isIndexRunning || isLoadingStatus}
            className="gap-1.5 text-xs font-mono"
          >
            <RefreshCw
              className={`size-3.5 ${isIndexRunning || reindexMutation.isPending ? "animate-spin" : ""}`}
            />
            {isIndexRunning ? "Indexing..." : "Reindex"}
          </Button>
        </div>
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

      {/* Unindexed Archive Warning Callout */}
      {hasNeverIndexed && (
        <Card className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-[8px] border border-amber-500/40 bg-amber-500/10 p-4 text-xs text-amber-100">
          <div className="flex items-center gap-3">
            <Database className="size-5 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-sm text-foreground">Archive Vector Index Not Found</p>
              <p className="text-ink-muted">
                Your saved posts must be embedded into Qdrant before search queries can find matches.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleReindex}
            disabled={reindexMutation.isPending || isIndexRunning}
            className="gap-1.5 shrink-0"
          >
            <Sparkles className="size-3.5" />
            Index Archive Now
          </Button>
        </Card>
      )}

      {/* Search Error Callout Banner */}
      {searchErrorMessage && (
        <Card className="flex items-center justify-between gap-3 rounded-[8px] border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-200">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="size-4 shrink-0 text-red-400" />
            <span className="font-mono">{searchErrorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setSearchErrorMessage(null)}
            className="text-red-400 hover:text-white"
          >
            <X className="size-4" />
          </button>
        </Card>
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
            setSearchErrorMessage(null);
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
                    setSearchErrorMessage(null);
                    setActiveQueryLabel(`"${prompt}"`);
                    searchByText.mutate(prompt, {
                      onSuccess: (hits) => setResults(hits),
                      onError: (err) => handleSearchError(err),
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

      {/* Vector Index Required Popup / Modal */}
      <Dialog open={showIndexModal} onOpenChange={setShowIndexModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Database className="size-5" />
              <DialogTitle className="text-base">Vector Index Required</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-ink-muted leading-relaxed">
              Your saved posts have not been indexed into the vector database yet. Vector search
              requires generating CLIP and face embeddings for your saved posts before searches can be run.
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-[6px] bg-surface-2/60 border border-hairline p-3 text-xs space-y-1.5 font-mono text-ink-muted">
            <div className="flex items-center justify-between">
              <span>Required Collections:</span>
              <span className="text-foreground font-semibold">post_images, post_faces</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Current Status:</span>
              <span className="text-amber-400">Not Indexed</span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setShowIndexModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleReindex} className="gap-1.5">
              <Sparkles className="size-3.5" />
              Index Saved Posts Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vector Search Statistics Modal */}
      <Dialog open={showStatsModal} onOpenChange={setShowStatsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <div className="flex items-center gap-2 text-foreground mb-1">
              <BarChart3 className="size-5 text-amber-500" />
              <DialogTitle className="text-base">Vector Search Statistics</DialogTitle>
            </div>
            <DialogDescription className="text-xs text-ink-muted">
              Telemetry, index coverage, and Qdrant cluster statistics across your profiles.
            </DialogDescription>
          </DialogHeader>

          {isLoadingStats ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="space-y-4 py-2 text-xs">
              {/* Profile Stats Card */}
              <div className="rounded-[8px] border border-hairline bg-surface-2/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between font-mono font-semibold text-foreground border-b border-hairline pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Activity className="size-3.5 text-amber-500" />
                    Active Profile Index
                  </span>
                  <span className="text-[11px] text-ink-subtle">
                    {stats?.status === "completed" ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="size-3" /> Completed
                      </span>
                    ) : stats?.status === "running" ? (
                      <span className="text-amber-400 animate-pulse">Running</span>
                    ) : (
                      <span className="text-ink-subtle">Not Indexed</span>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-ink-subtle flex items-center gap-1">
                      <Clock className="size-3" /> Last Run:
                    </span>
                    <span className="text-foreground">
                      {stats?.lastRunAt
                        ? new Date(stats.lastRunAt).toLocaleString()
                        : "Never"}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink-subtle flex items-center gap-1">
                      <Calendar className="size-3" /> Post Cutoff:
                    </span>
                    <span className="text-foreground">
                      {stats?.cutoffPostDate
                        ? new Date(stats.cutoffPostDate).toLocaleDateString()
                        : "None"}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink-subtle flex items-center gap-1">
                      <Layers className="size-3" /> Indexed Items:
                    </span>
                    <span className="text-foreground">
                      {stats?.indexedItems ?? 0} / {stats?.totalItems ?? 0}
                    </span>
                  </div>

                  <div>
                    <span className="text-ink-subtle flex items-center gap-1">
                      <ScanFace className="size-3" /> Faces Found:
                    </span>
                    <span className="text-foreground">{stats?.facesIndexed ?? 0}</span>
                  </div>
                </div>

                {stats?.failedItems && stats.failedItems > 0 ? (
                  <div className="rounded bg-red-500/10 border border-red-500/20 p-2 text-red-300 font-mono text-[11px]">
                    Failed Items: {stats.failedItems} ({stats.lastError || "Unknown error"})
                  </div>
                ) : null}
              </div>

              {/* Cluster & Global Stats Card */}
              <div className="rounded-[8px] border border-hairline bg-surface-2/40 p-3.5 space-y-2.5">
                <div className="flex items-center justify-between font-mono font-semibold text-foreground border-b border-hairline pb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Database className="size-3.5 text-blue-400" />
                    Qdrant Database & Cluster
                  </span>
                  <span className="text-[11px] text-ink-subtle">
                    {vectorStatsData?.totalProfilesIndexed ?? 0} Profiles Indexed
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-ink-subtle">Image Vectors:</span>
                    <p className="text-foreground text-sm font-semibold">
                      {vectorStatsData?.qdrant?.profilePoints?.images?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-ink-subtle">Face Vectors:</span>
                    <p className="text-foreground text-sm font-semibold">
                      {vectorStatsData?.qdrant?.profilePoints?.faces?.toLocaleString() ?? 0}
                    </p>
                  </div>
                  <div>
                    <span className="text-ink-subtle">Cluster Latency:</span>
                    <p className="text-emerald-400">{liveness?.latencyMs ?? 0} ms</p>
                  </div>
                  <div>
                    <span className="text-ink-subtle">Storage Backend:</span>
                    <p className="text-foreground">Qdrant RocksDB</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="flex justify-between sm:justify-between w-full">
            <Button asChild variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
              <a href={dashboardUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="size-3.5" />
                Open Qdrant Dashboard
              </a>
            </Button>
            <Button size="sm" onClick={() => setShowStatsModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
