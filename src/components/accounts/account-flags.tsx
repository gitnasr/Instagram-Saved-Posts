import { BadgeCheck, EyeOff, Lock, Unlink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Account } from "@/types";

type Flags = Pick<Account, "isVerified" | "isPrivate" | "lostAt" | "ignoredAt">;

/** Account status as small icons (verified, private, lost, ignored). One place for every list and header. */
export function AccountFlags({ account, className }: { account: Flags; className?: string }) {
  const flags = [
    { on: account.isVerified, Icon: BadgeCheck, label: "Verified", tone: "text-highlight" },
    { on: account.isPrivate, Icon: Lock, label: "Private", tone: "text-ink-muted" },
    { on: Boolean(account.lostAt), Icon: Unlink, label: "Lost", tone: "text-danger" },
    { on: Boolean(account.ignoredAt), Icon: EyeOff, label: "Ignored", tone: "text-ink-subtle" },
  ].filter((f) => f.on);

  if (flags.length === 0) return null;

  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1", className)}>
      {flags.map(({ Icon, label, tone }) => (
        <Icon key={label} role="img" aria-label={label} className={cn("size-3.5", tone)}>
          <title>{label}</title>
        </Icon>
      ))}
    </span>
  );
}
