"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export const DASHBOARD_SCROLL_SELECTOR = "[data-dashboard-scroll]";
export const SCROLL_QUERY_PARAM = "scroll";

interface UseScrollUrlSyncOptions {
  enabled?: boolean;
  param?: string;
  selector?: string;
}

export function scrollDashboardToTop() {
  document
    .querySelector<HTMLElement>(DASHBOARD_SCROLL_SELECTOR)
    ?.scrollTo({ top: 0, behavior: "auto" });
}

export function useScrollUrlSync({
  enabled = true,
  param = SCROLL_QUERY_PARAM,
  selector = DASHBOARD_SCROLL_SELECTOR,
}: UseScrollUrlSyncOptions = {}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const savedScroll = searchParams.get(param);

  useEffect(() => {
    if (!enabled) return;

    const container = document.querySelector<HTMLElement>(selector);
    if (!container) return;

    const savedTop = Number(savedScroll);
    const targetTop =
      Number.isFinite(savedTop) && savedTop > 0 ? Math.round(savedTop) : 0;

    let retryTimeout: number | undefined;
    const restoreScroll = (attempt = 0) => {
      container.scrollTo({ top: targetTop, behavior: "auto" });

      const isRestored =
        targetTop === 0 || Math.abs(container.scrollTop - targetTop) < 4;

      if (!isRestored && attempt < 12) {
        retryTimeout = window.setTimeout(() => {
          restoreScroll(attempt + 1);
        }, 100);
      }
    };

    const restoreFrame = window.requestAnimationFrame(() => {
      restoreScroll();
    });

    const writeScrollToUrl = () => {
      const top = Math.round(container.scrollTop);
      const url = new URL(window.location.href);
      const previous = url.searchParams.get(param);

      if (top > 20) {
        url.searchParams.set(param, String(top));
      } else {
        url.searchParams.delete(param);
      }

      const next = url.searchParams.get(param);
      if (previous !== next) {
        window.history.replaceState(
          window.history.state,
          "",
          `${url.pathname}${url.search}${url.hash}`
        );
      }
    };

    let frame = 0;
    const handleScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        writeScrollToUrl();
      });
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("pagehide", writeScrollToUrl);

    return () => {
      window.cancelAnimationFrame(restoreFrame);
      if (retryTimeout) window.clearTimeout(retryTimeout);
      if (frame) window.cancelAnimationFrame(frame);
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("pagehide", writeScrollToUrl);
    };
  }, [enabled, param, pathname, savedScroll, selector]);
}
