"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
  textClassName?: string;
}

export function BrandLogo({
  className,
  size = 28,
  showText = true,
  textClassName,
}: BrandLogoProps) {
  return (
    <div className={cn("flex items-center gap-2.5 select-none", className)}>
      <div className="relative shrink-0 flex items-center justify-center rounded-md bg-amber-500/10 p-1 border border-amber-500/20">
        <Image
          src="/logo.png"
          alt="Saved Posts Tracker Logo"
          width={size}
          height={size}
          className="object-contain"
          priority
        />
      </div>
      {showText && (
        <div className="flex flex-col min-w-0 leading-tight">
          <span className={cn("font-semibold text-sm tracking-tight text-foreground truncate", textClassName)}>
            Saved Posts
          </span>
          <span className="text-[10px] font-mono uppercase tracking-wider text-amber-500 dark:text-amber-400 font-medium">
            Archive
          </span>
        </div>
      )}
    </div>
  );
}
