"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";
import { rememberVisitedAccount } from "@/hooks/use-last-visited-account";
import { useAccountTabBehavior } from "@/hooks/use-account-tab-behavior";
import { openAccountDrawer } from "@/hooks/use-account-drawer";

interface ProfileLinkProps {
  username: string;
  className?: string;
  ariaLabel?: string;
  children?: ReactNode;
}

/**
 * Link to an account. Opens in a new tab by default, or in an in-page
 * slide-over drawer when the user selects "Stay on current page" in Settings,
 * and records the click so the accounts grid can highlight where the user left off.
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
    if (
      behavior === "stay-on-page" &&
      e.button === 0 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.shiftKey &&
      !e.altKey
    ) {
      e.preventDefault();
      openAccountDrawer(username);
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
