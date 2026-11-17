"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, X } from "lucide-react";

const EXAMPLE_PROMPTS = [
  "Minimalist architecture",
  "Golden hour sunset",
  "Vintage car aesthetics",
  "Coffee and workspace",
  "Dark moody portrait",
  "Tokyo street photography",
];

interface TextSearchPanelProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmit: (e?: React.FormEvent) => void;
  onSuggestion: (prompt: string) => void;
  isPending: boolean;
}

export function TextSearchPanel({
  query,
  onQueryChange,
  onSubmit,
  onSuggestion,
  isPending,
}: TextSearchPanelProps) {
  return (
    <div className="space-y-3">
      <form onSubmit={onSubmit} className="flex gap-2">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-subtle" />
          <Input
            type="text"
            aria-label="Describe what you want to find"
            placeholder="Describe what to find, e.g. sunset skyline or funny cat"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            className="h-10 pl-9 pr-8 text-sm"
          />
          {query && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => onQueryChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>
        <Button type="submit" disabled={!query.trim() || isPending} className="h-10 gap-1.5 px-4">
          <SearchIcon className="size-3.5" />
          Search
        </Button>
      </form>

      <div className="flex flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
        <span>Try:</span>
        {EXAMPLE_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => onSuggestion(prompt)}
            className="rounded-sm bg-surface-2 px-2 py-0.5 text-xs text-ink-muted transition-colors hover:text-foreground"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
