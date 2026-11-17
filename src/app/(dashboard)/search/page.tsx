"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { toast } from "sonner";
import { Header } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusText } from "@/components/ui/status-text";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { PostDetailDialog } from "@/components/posts/post-detail-dialog";
import { IndexCallouts } from "@/components/search/index-callouts";
import { SearchResults } from "@/components/search/search-results";
import { useVectorIndexStatus, useReindexVectors } from "@/hooks/use-vector-search";
import { useSearchSession, type SearchMode } from "@/hooks/use-search-session";
import { BarChart3, Database, ImageIcon, RefreshCw, ScanFace, Sparkles } from "lucide-react";
import type { Post } from "@/types";

// Each mode panel and the statistics dialog are fetched only when first shown.
const PanelFallback = () => <Skeleton className="h-24 w-full" />;
const TextSearchPanel = dynamic(
  () => import("@/components/search/text-search-panel").then((m) => m.TextSearchPanel),
  { loading: PanelFallback }
);
const FileSearchPanel = dynamic(
  () => import("@/components/search/file-search-panel").then((m) => m.FileSearchPanel),
  { loading: PanelFallback }
);
const SearchStatsDialog = dynamic(
  () => import("@/components/search/search-stats-dialog").then((m) => m.SearchStatsDialog)
);

export default function SearchPage() {
  const [showIndexModal, setShowIndexModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  const session = useSearchSession({ onNeedsIndex: () => setShowIndexModal(true) });
  const { data: indexStatus, isLoading: isLoadingStatus } = useVectorIndexStatus();
  const reindexMutation = useReindexVectors();

  const liveness = indexStatus?.liveness;
  const searchEnabled = indexStatus?.configured ?? false;
  const isIndexRunning = indexStatus?.current?.status === "running";

  const handleReindex = () => {
    setShowIndexModal(false);
    reindexMutation.mutate(undefined, {
      onSuccess: () => toast.success("Vector indexing initiated in background."),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <Header
        title="Search"
        description="Beta. Find posts by description, a similar photo or a face."
      >
        {searchEnabled && (
          <>
            {liveness && (
              <StatusText
                tone={
                  liveness.status === "healthy" ? "success" : liveness.status === "degraded" ? "warn" : "danger"
                }
                live={liveness.status === "healthy"}
              >
                {liveness.status === "healthy"
                  ? `Qdrant ${liveness.latencyMs}ms`
                  : liveness.status === "degraded"
                    ? "Qdrant empty"
                    : "Qdrant offline"}
              </StatusText>
            )}
            <Button variant="outline" size="sm" onClick={() => setShowStatsModal(true)} className="gap-1.5 text-xs">
              <BarChart3 className="size-3.5" />
              Statistics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleReindex}
              disabled={reindexMutation.isPending || isIndexRunning || isLoadingStatus}
              className="gap-1.5 text-xs"
            >
              <RefreshCw
                className={`size-3.5 ${isIndexRunning || reindexMutation.isPending ? "animate-spin" : ""}`}
              />
              {isIndexRunning ? "Indexing…" : "Reindex"}
            </Button>
          </>
        )}
      </Header>

      <IndexCallouts
        status={indexStatus}
        isLoading={isLoadingStatus}
        errorMessage={session.errorMessage}
        onDismissError={session.dismissError}
        onReindex={handleReindex}
        reindexPending={reindexMutation.isPending}
      />

      {searchEnabled && (
        <Tabs value={session.mode} onValueChange={(v) => session.changeMode(v as SearchMode)}>
          {/* Full labels overflow a phone viewport, so the qualifier drops below sm. */}
          <TabsList className="w-full sm:w-fit">
            <TabsTrigger value="text" className="min-w-0 flex-1 gap-1.5 sm:flex-none">
              <Sparkles className="size-3.5 shrink-0" />
              <span className="hidden sm:inline">Prompt&nbsp;</span>Search
            </TabsTrigger>
            <TabsTrigger value="image" className="min-w-0 flex-1 gap-1.5 sm:flex-none">
              <ImageIcon className="size-3.5 shrink-0" />
              Visual<span className="hidden sm:inline">&nbsp;Similarity</span>
            </TabsTrigger>
            <TabsTrigger value="face" className="min-w-0 flex-1 gap-1.5 sm:flex-none">
              <ScanFace className="size-3.5 shrink-0" />
              Face<span className="hidden sm:inline">&nbsp;Recognition</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="text">
            <TextSearchPanel
              query={session.textQuery}
              onQueryChange={session.setTextQuery}
              onSubmit={session.submitText}
              onSuggestion={(prompt) => {
                session.setTextQuery(prompt);
                session.runText(prompt);
              }}
              isPending={session.isPending}
            />
          </TabsContent>
          <TabsContent value="image">
            <FileSearchPanel mode="image" previewUrl={session.previewUrl} onFile={session.runFile} />
          </TabsContent>
          <TabsContent value="face">
            <FileSearchPanel mode="face" previewUrl={session.previewUrl} onFile={session.runFile} />
          </TabsContent>
        </Tabs>
      )}

      {session.isPending && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-lg" />
          ))}
        </div>
      )}

      {!session.isPending && session.results && (
        <SearchResults
          results={session.results}
          label={session.activeQueryLabel}
          onSelect={setSelectedPost}
        />
      )}

      <Dialog open={showIndexModal} onOpenChange={setShowIndexModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-1 flex items-center gap-2 text-amber-500">
              <Database className="size-5" />
              <DialogTitle className="text-base">Vector Index Required</DialogTitle>
            </div>
            <DialogDescription className="text-xs leading-relaxed text-ink-muted">
              Your saved posts have not been indexed into the vector database yet. Search needs CLIP
              and face embeddings for your saved posts before it can run.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="ghost" size="sm" onClick={() => setShowIndexModal(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleReindex} className="gap-1.5">
              <Sparkles className="size-3.5" />
              Index saved posts now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {showStatsModal && (
        <SearchStatsDialog
          open
          onOpenChange={setShowStatsModal}
          status={indexStatus}
          isLoading={isLoadingStatus}
        />
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
