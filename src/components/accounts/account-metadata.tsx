"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useUpdateAccount } from "@/hooks/use-update-account";
import {
  ACCOUNT_STATUS_OPTIONS,
  dedupeAndSortTextOptions,
  formatTimelineTimestamp,
  getTodayDateInputValue,
} from "@/lib/account-metadata";
import type { Account } from "@/types";

interface AccountMetadataProps {
  account: Account;
  existsAlsoOptions: string[];
}

const CUSTOM_STATUS_VALUE = "__custom__";
const NO_STATUS_VALUE = "__none__";

function getInitialStatusSelection(status: string | null) {
  if (!status) return NO_STATUS_VALUE;
  return ACCOUNT_STATUS_OPTIONS.includes(
    status as (typeof ACCOUNT_STATUS_OPTIONS)[number]
  )
    ? status
    : CUSTOM_STATUS_VALUE;
}

export function AccountMetadata({
  account,
  existsAlsoOptions,
}: AccountMetadataProps) {
  const today = useMemo(() => getTodayDateInputValue(), []);
  const savedStatus = account.accountStatus ?? "";
  const [lastScrapeOn, setLastScrapeOn] = useState(account.lastScrapeOn ?? "");
  const [statusSelection, setStatusSelection] = useState(
    getInitialStatusSelection(account.accountStatus)
  );
  const [customStatus, setCustomStatus] = useState(
    getInitialStatusSelection(account.accountStatus) === CUSTOM_STATUS_VALUE
      ? savedStatus
      : ""
  );
  const [existsAlso, setExistsAlso] = useState(account.existsAlso ?? "");
  const [newExistsAlsoOption, setNewExistsAlsoOption] = useState("");
  const [localExistsAlsoOptions, setLocalExistsAlsoOptions] = useState(() =>
    dedupeAndSortTextOptions([
      ...existsAlsoOptions,
      ...(account.existsAlso ? [account.existsAlso] : []),
    ])
  );

  const { mutate: updateAccount, isPending } = useUpdateAccount(account.username);

  const effectiveStatus =
    statusSelection === CUSTOM_STATUS_VALUE
      ? customStatus.trim()
      : statusSelection === NO_STATUS_VALUE
        ? ""
        : statusSelection;

  const pendingExistsAlsoOption = newExistsAlsoOption.trim();
  const effectiveExistsAlso = pendingExistsAlsoOption || existsAlso || "";

  const isDirty =
    lastScrapeOn !== (account.lastScrapeOn ?? "") ||
    effectiveStatus !== savedStatus ||
    effectiveExistsAlso !== (account.existsAlso ?? "");

  const isIgnored = account.ignoredAt != null;
  const ignoredSince = account.ignoredAt
    ? formatTimelineTimestamp(account.ignoredAt)
    : null;

  // Applied immediately rather than behind Save Details — an export-affecting
  // flag shouldn't sit in an unsaved form.
  const handleToggleIgnored = (next: boolean) => {
    updateAccount(
      { ignored: next },
      {
        onSuccess: () =>
          toast.success(next ? "Account ignored" : "Account un-ignored"),
        onError: (error) => toast.error(error.message),
      }
    );
  };

  const handleAddExistsAlsoOption = () => {
    const trimmed = newExistsAlsoOption.trim();
    if (!trimmed) {
      toast.error("Enter an account name first");
      return;
    }

    const existingOption = localExistsAlsoOptions.find(
      (option) => option.toLocaleLowerCase() === trimmed.toLocaleLowerCase()
    );

    const nextValue = existingOption ?? trimmed;

    setLocalExistsAlsoOptions(
      dedupeAndSortTextOptions([...localExistsAlsoOptions, nextValue])
    );
    setExistsAlso(nextValue);
    setNewExistsAlsoOption("");
  };

  const handleSave = () => {
    updateAccount(
      {
        lastScrapeOn: lastScrapeOn || null,
        accountStatus: effectiveStatus || null,
        existsAlso: existsAlso || null,
        newExistsAlsoOption: pendingExistsAlsoOption || null,
      },
      {
        onSuccess: () => {
          toast.success("Account details saved");
          setNewExistsAlsoOption("");
        },
        onError: (error) => {
          toast.error(error.message);
        },
      }
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Account Details</CardTitle>
            <p className="text-sm text-muted-foreground">
              Track scrape dates, linked accounts, and a custom status timeline.
            </p>
          </div>
          <Badge variant="outline">{effectiveStatus || "No status"}</Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="last-scrape-on">Last Scrape</Label>
            <Input
              id="last-scrape-on"
              type="date"
              value={lastScrapeOn}
              onFocus={() => {
                if (!lastScrapeOn) {
                  setLastScrapeOn(today);
                }
              }}
              onChange={(event) => setLastScrapeOn(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select
              value={statusSelection}
              onValueChange={(value) => {
                setStatusSelection(value);
                if (value !== CUSTOM_STATUS_VALUE) {
                  setCustomStatus("");
                }
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_STATUS_VALUE}>No status</SelectItem>
                {ACCOUNT_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
                <SelectItem value={CUSTOM_STATUS_VALUE}>Custom status</SelectItem>
              </SelectContent>
            </Select>
            {statusSelection === CUSTOM_STATUS_VALUE && (
              <Input
                placeholder="Type a custom status"
                value={customStatus}
                onChange={(event) => setCustomStatus(event.target.value)}
              />
            )}
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Exists Also</Label>
            <Select
              value={existsAlso || "__none__"}
              onValueChange={(value) =>
                setExistsAlso(value === "__none__" ? "" : value)
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a linked account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">No linked account</SelectItem>
                {localExistsAlsoOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Add another reusable account name"
                value={newExistsAlsoOption}
                onChange={(event) => setNewExistsAlsoOption(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleAddExistsAlsoOption();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddExistsAlsoOption}
              >
                Add Option
              </Button>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-lg border px-3 py-3">
          <div className="space-y-0.5">
            <Label htmlFor="ignore-account" className="text-sm font-medium">
              Ignore account
            </Label>
            <p className="text-xs text-muted-foreground">
              {ignoredSince
                ? `Excluded from CSV exports since ${ignoredSince.absolute}`
                : "Excluded from CSV exports until you turn this back off"}
            </p>
          </div>
          <Switch
            id="ignore-account"
            checked={isIgnored}
            disabled={isPending}
            onCheckedChange={handleToggleIgnored}
          />
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={!isDirty || isPending}>
            {isPending ? "Saving..." : "Save Details"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
