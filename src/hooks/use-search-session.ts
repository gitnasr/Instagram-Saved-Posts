"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  useSearchByText,
  useSearchByImage,
  useSearchByFace,
  type VectorSearchError,
} from "@/hooks/use-vector-search";
import type { VectorSearchHit } from "@/types";

export type SearchMode = "text" | "image" | "face";

/**
 * All state for one search screen: the active mode, the query/preview, results and errors.
 * A token plus the mode guard drop responses from a superseded search or a mode switch.
 */
export function useSearchSession({ onNeedsIndex }: { onNeedsIndex: () => void }) {
  const [mode, setMode] = useState<SearchMode>("text");
  const modeRef = useRef<SearchMode>(mode);
  const searchTokenRef = useRef(0);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const [textQuery, setTextQuery] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [results, setResults] = useState<VectorSearchHit[] | null>(null);
  const [activeQueryLabel, setActiveQueryLabel] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Revoke object URLs on preview change and on unmount
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const searchByText = useSearchByText();
  const searchByImage = useSearchByImage();
  const searchByFace = useSearchByFace();

  const isPending =
    mode === "text"
      ? searchByText.isPending
      : mode === "image"
        ? searchByImage.isPending
        : searchByFace.isPending;

  const handleSearchError = (err: VectorSearchError | Error) => {
    const isIndexNeeded = "needsIndexing" in err ? err.needsIndexing : false;
    if (isIndexNeeded) {
      onNeedsIndex();
      setErrorMessage("Vector index has not been built yet. Please run the indexer first.");
    } else {
      setErrorMessage(err.message);
      toast.error(err.message);
    }
  };

  const changeMode = (newMode: SearchMode) => {
    modeRef.current = newMode;
    searchTokenRef.current += 1;
    searchByText.reset();
    searchByImage.reset();
    searchByFace.reset();
    setMode(newMode);
    setResults(null);
    setPreviewUrl(null);
    setActiveQueryLabel(null);
    setErrorMessage(null);
  };

  const runText = (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    const token = ++searchTokenRef.current;
    const requestMode: SearchMode = "text";

    setResults(null);
    setErrorMessage(null);
    setActiveQueryLabel(`"${trimmed}"`);

    searchByText.mutate(trimmed, {
      onSuccess: (hits) => {
        if (token !== searchTokenRef.current || modeRef.current !== requestMode) return;
        setResults(hits);
      },
      onError: (err) => {
        if (token !== searchTokenRef.current || modeRef.current !== requestMode) return;
        handleSearchError(err);
      },
    });
  };

  const submitText = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    runText(textQuery);
  };

  const runFile = (file: File) => {
    const token = ++searchTokenRef.current;
    const requestMode = modeRef.current;
    const objectUrl = URL.createObjectURL(file);

    setPreviewUrl(objectUrl);
    setResults(null);
    setErrorMessage(null);
    setActiveQueryLabel(file.name);

    const isStale = () => token !== searchTokenRef.current || modeRef.current !== requestMode;
    const mutation = requestMode === "image" ? searchByImage : searchByFace;
    mutation.mutate(file, {
      onSuccess: (hits) => {
        if (!isStale()) setResults(hits);
      },
      onError: (err) => {
        if (!isStale()) handleSearchError(err);
      },
    });
  };

  return {
    mode,
    changeMode,
    textQuery,
    setTextQuery,
    previewUrl,
    results,
    activeQueryLabel,
    errorMessage,
    dismissError: () => setErrorMessage(null),
    isPending,
    runText,
    submitText,
    runFile,
  };
}
