"use client";

import { PostCard } from "@/components/posts/post-card";
import type { Post, VectorSearchHit } from "@/types";

const MATCH_LABEL: Record<string, string> = {
  hybrid: "Hybrid",
  caption: "Caption",
  account: "Author",
  face: "Face",
};

interface SearchResultsProps {
  results: VectorSearchHit[];
  label: string | null;
  onSelect: (post: Post) => void;
}

export function SearchResults({ results, label, onSelect }: SearchResultsProps) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-muted">
        {results.length === 0 ? (
          <>No matching posts found{label && ` for ${label}`}.</>
        ) : (
          <>
            <strong className="text-foreground">{results.length}</strong> matching post
            {results.length === 1 ? "" : "s"}
            {label && ` for ${label}`}
          </>
        )}
      </p>

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {results.map((hit) => {
            const pct = Math.round(hit.score * 100);
            return (
              <div key={hit.post.pk} className="group relative">
                <PostCard
                  post={hit.post}
                  onClick={() => onSelect(hit.post)}
                  thumbnailOverride={hit.matchedImageUrl}
                  matchedSlideIndex={hit.matchedSlideIndex}
                />
                <div className="pointer-events-none absolute left-2 top-2 flex items-center gap-1.5 rounded-sm bg-black/80 px-1.5 py-0.5 font-mono text-xs font-medium text-white">
                  <span
                    className={
                      pct >= 85 ? "text-highlight" : pct >= 70 ? "text-success" : "text-white/80"
                    }
                  >
                    {pct}%
                  </span>
                  <span className="text-xs font-normal text-white/60">
                    {hit.matchType ? (MATCH_LABEL[hit.matchType] ?? "Visual") : null}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
