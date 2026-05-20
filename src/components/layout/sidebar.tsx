"use client";

import { NavLink } from "./nav-link";
import { BarChart3, Users, Play, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/", label: "Overview", icon: BarChart3 },
  { href: "/accounts", label: "Accounts", icon: Users },
  { href: "/scrape", label: "Scrape", icon: Play },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  return (
    <>
      <aside className="hidden h-dvh w-64 flex-col border-r bg-card md:flex">
        <div className="flex h-14 items-center px-4">
          <h1 className="text-lg font-semibold">IG Saved Tracker</h1>
        </div>
        <Separator />
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map(({ href, label, icon: Icon }) => (
            <NavLink key={href} href={href} icon={<Icon />}>
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <nav className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 gap-1 border-t bg-background/95 p-2 backdrop-blur md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => (
          <NavLink
            key={href}
            href={href}
            icon={<Icon />}
            className="min-h-12 flex-col justify-center gap-1 rounded-md px-1 py-2 text-[11px]"
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </>
  );
}
