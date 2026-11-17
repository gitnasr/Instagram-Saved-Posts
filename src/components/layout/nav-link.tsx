"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface NavLinkProps {
  href: string;
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}

export function NavLink({ href, children, icon, className }: NavLinkProps) {
  const pathname = usePathname();
  const isActive = href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={cn(
        "group flex min-h-9 items-center gap-2.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "text-foreground [&_svg]:text-highlight"
          : "text-ink-muted hover:text-foreground [&_svg]:text-ink-muted",
        className
      )}
    >
      {icon}
      {/* The landing's nav rule: no fill, a 2px line under the word for the current page, hover and focus. */}
      <span
        className={cn(
          "underline decoration-2 underline-offset-[6px] transition-colors",
          isActive
            ? "decoration-current"
            : "decoration-transparent group-hover:decoration-current group-focus-visible:decoration-current"
        )}
      >
        {children}
      </span>
    </Link>
  );
}
