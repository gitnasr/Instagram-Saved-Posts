"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { rememberVisitedAccount } from "@/hooks/use-last-visited-account";

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
 */
export function ProfileLink({
  username,
  className,
  ariaLabel,
  children,
}: ProfileLinkProps) {
  return (
    <Link
      href={`/accounts/${username}`}
      aria-label={ariaLabel}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => rememberVisitedAccount(username)}
    >
      {children}
    </Link>
  );
}
