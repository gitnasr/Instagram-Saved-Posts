"use client";

import { NavLink } from "./nav-link";
<<<<<<< HEAD
import { BarChart3, Users, Play, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
=======
import { BrandLogo } from "./brand-logo";
import {
  LayoutDashboard,
  Users,
  Play,
  Search,
  Settings,
} from "lucide-react";
>>>>>>> 0a69dfb (feat(layout): redesign application shell, sidebar, profile switcher, and brand header)
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ProfileSwitcher } from "@/components/layout/profile-switcher";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/scrape", label: "Scrape", icon: Play },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <>
      <aside className="hidden h-dvh w-64 flex-col border-r border-hairline bg-surface-1/50 backdrop-blur-md md:flex select-none">
        {/* Brand Header */}
        <div className="flex h-16 items-center px-4 border-b border-hairline">
          <BrandLogo size={24} />
        </div>

        {/* Profile Switcher */}
        <div className="p-3">
          <ProfileSwitcher />
        </div>

        <div className="px-3 pb-2">
          <div className="h-px w-full bg-hairline" />
        </div>

        {/* Navigation */}
        <nav className="flex flex-1 flex-col gap-1 px-3 py-1">
          <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-ink-subtle">
            Workspace
          </div>
          {navItems.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} icon={<Icon className="size-4 shrink-0" />}>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Panel */}
        <div className="p-3 border-t border-hairline bg-surface-1/30 flex flex-col gap-2">
          <ThemeToggle showLabel />
          <div className="flex items-center justify-between px-1 text-[11px] text-ink-subtle font-mono">
            <span>Amber Zinc v0.1</span>
            <span className="flex items-center gap-1 text-amber-500/80">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live
            </span>
          </div>
        </div>
      </aside>

<<<<<<< HEAD
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 gap-1 border-t bg-background/95 p-2 backdrop-blur md:hidden">
=======
      {/* Mobile Bottom Bar */}
      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-6 gap-1 border-t border-hairline bg-surface-1/90 p-2 backdrop-blur-xl md:hidden">
>>>>>>> 0a69dfb (feat(layout): redesign application shell, sidebar, profile switcher, and brand header)
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            icon={<Icon className="size-4" />}
            className="min-h-12 flex-col justify-center gap-1 rounded-[4px] px-1 py-2 text-[10px]"
          >
            {label}
          </NavLink>
        ))}
        <ThemeToggle
          showLabel
          labelText="Theme"
          className="mx-auto min-h-12 w-full flex-col justify-center gap-1 rounded-[4px] px-1 py-2 text-[10px]"
        />
      </nav>
    </>
  );
}
