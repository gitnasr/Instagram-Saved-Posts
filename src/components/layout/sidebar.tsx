"use client";

import { NavLink } from "./nav-link";
import { BarChart3, Users, Play, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";

export function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-14 items-center px-4">
        <h1 className="text-lg font-semibold">IG Saved Tracker</h1>
      </div>
      <Separator />
      <nav className="flex-1 space-y-1 p-3">
        <NavLink href="/" icon={<BarChart3 className="h-4 w-4" />}>
          Overview
        </NavLink>
        <NavLink href="/accounts" icon={<Users className="h-4 w-4" />}>
          Accounts
        </NavLink>
        <NavLink href="/scrape" icon={<Play className="h-4 w-4" />}>
          Scrape
        </NavLink>
        <NavLink href="/settings" icon={<Settings className="h-4 w-4" />}>
          Settings
        </NavLink>
      </nav>
    </aside>
  );
}
