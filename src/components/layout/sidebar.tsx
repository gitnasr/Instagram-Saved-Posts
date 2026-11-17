"use client";

import { NavLink } from "./nav-link";
import { BrandLogo } from "./brand-logo";
import {
  LayoutDashboard,
  Users,
  Play,
  Search,
  Settings,
} from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ProfileSwitcher } from "@/components/layout/profile-switcher";
import { UpdateIndicator } from "@/components/layout/update-indicator";
import { APP_VERSION, GITHUB_RELEASES_URL } from "@/lib/constants";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/scrape", label: "Scrape", icon: Play },
  { href: "/search", label: "Search", icon: Search },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <>
      <aside className="hidden h-dvh w-52 flex-col border-r border-hairline bg-canvas md:flex select-none">
        <div className="flex h-14 items-center px-4">
          <BrandLogo size={24} />
        </div>

        <div className="px-3 pb-3">
          <ProfileSwitcher />
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 px-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} icon={<Icon className="size-4 shrink-0" />}>
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center justify-between gap-2 px-3 py-3">
          <ThemeToggle />
          <div className="flex items-center gap-1.5">
            <UpdateIndicator />
            <a
              href={GITHUB_RELEASES_URL}
              target="_blank"
              rel="noopener noreferrer"
              title="View releases on GitHub"
              className="font-mono text-xs text-ink-subtle transition-colors hover:text-foreground"
            >
              {APP_VERSION.startsWith("v") ? APP_VERSION : `v${APP_VERSION}`}
            </a>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t border-hairline bg-canvas p-2 md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            icon={<Icon className="size-4" />}
            className="min-h-12 flex-col justify-center gap-1 px-1 py-2 text-xs"
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
