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
        "flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm font-medium transition-all group relative",
        isActive
          ? "bg-surface-2 text-foreground border border-hairline font-medium shadow-xs [&_svg]:text-primary"
          : "text-ink-muted hover:text-foreground hover:bg-surface-2/60 border border-transparent [&_svg]:text-ink-muted group-hover:[&_svg]:text-foreground",
        className
      )}
    >
      {icon}
      <span>{children}</span>
    </Link>
  );
}
