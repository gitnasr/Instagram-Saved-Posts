"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { rememberVisitedAccount } from "@/hooks/use-last-visited-account";
import {
  useAccountTabBehavior,
  openAccountTab,
} from "@/hooks/use-account-tab-behavior";

interface ProfileLinkProps {
  username: string;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
}

/**
 * Link to an account profile. Always opens in a new tab so the page the user
 * navigated from keeps its place (scroll, filters, selections), and records
 * the click so the accounts grid can highlight where the user left off.
 *
 * Honors the user's tab behavior preference: switches to the new tab (default)
 * or attempts to keep focus on the current page for bulk browsing.
 */
export function ProfileLink({
  username,
  className,
  ariaLabel,
  children,
}: ProfileLinkProps) {
  const [behavior] = useAccountTabBehavior();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    rememberVisitedAccount(username);
    // If the user wants to stay on the page and it's a standard primary left-click without modifier keys,
    // handle it via openAccountTab to attempt to keep the current window in focus.
    if (
      behavior === "stay-on-page" &&
      e.button === 0 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      openAccountTab(username, "stay-on-page");
    }
  };

  return (
    <Link
      href={`/accounts/${username}`}
      aria-label={ariaLabel}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children}
    </Link>
  );
}
