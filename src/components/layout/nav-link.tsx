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
      className={cn(
        "flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
        isActive
          ? "bg-surface-2 text-foreground [&_svg]:text-primary"
          : "text-ink-muted hover:text-foreground hover:bg-surface-2/60 [&_svg]:text-ink-muted",
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
