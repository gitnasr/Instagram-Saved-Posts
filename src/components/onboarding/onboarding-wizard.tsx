"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle2,
  AlertCircle,
  Database,
  Cloud,
  Instagram,
  ArrowRight,
  ArrowLeft,
  Loader2,
  HelpCircle,
  ShieldCheck,
  Play,
  Sparkles,
  Eye,
  EyeOff,
  X,
  HardDrive,
  Zap,
  Image as ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProfileAvatar } from "@/components/profiles/profile-avatar";
import { toast } from "sonner";
import { useCreateProfile, useSelectProfile } from "@/hooks/use-profiles";
import type { CloudinaryStats } from "@/hooks/use-cloudinary-config";

interface ValidatedUser {
  pk: string;
  username: string;
  profilePicUrl: string | null;
}

/** Format bytes into a human-readable string (e.g. "1.2 GB") */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function OnboardingWizard() {
  const createProfile = useCreateProfile();
  const selectProfile = useSelectProfile();

  const [step, setStep] = useState<number>(1);
  const [dbStatus, setDbStatus] = useState<"checking" | "connected" | "error">(
    "checking"
  );
  const [dbLatency, setDbLatency] = useState<number | null>(null);

  // Form State
  const [profileName, setProfileName] = useState("My Saved Posts");
  const [cookie, setCookie] = useState("");
  const [userAgent, setUserAgent] = useState("");
  const [showUa, setShowUa] = useState(false);
  const [showCookieGuide, setShowCookieGuide] = useState(false);

  // Cookie Validation State
  const [isValidating, setIsValidating] = useState(false);
  const [validatedUser, setValidatedUser] = useState<ValidatedUser | null>(
    null
  );

  // Cloudinary State (Step 3)
  const [cloudName, setCloudName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [showSecret, setShowSecret] = useState(false);
  const [isTestingCloud, setIsTestingCloud] = useState(false);
  const [cloudStats, setCloudStats] = useState<CloudinaryStats | null>(null);
  const [cloudConnected, setCloudConnected] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);

  // Step 1: Health check
  useEffect(() => {
    const checkHealth = async () => {
      const start = Date.now();
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          setDbStatus("connected");
          setDbLatency(Date.now() - start);
        } else {
          setDbStatus("error");
        }
      } catch {
        setDbStatus("error");
      }
    };
    checkHealth();
  }, []);

  // Validate Instagram Cookie
  const handleValidateCookie = async () => {
    if (!cookie.trim()) {
      toast.error("Please paste your Instagram cookie first");
      return;
    }

    setIsValidating(true);
    setValidatedUser(null);

    try {
      const res = await fetch("/api/auth/validate-cookie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cookie: cookie.trim(),
          userAgent: userAgent.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.valid && data.user) {
        setValidatedUser(data.user);
        if (data.user.username && profileName === "My Saved Posts") {
          setProfileName(`@${data.user.username}`);
        }
        toast.success(`Connected to @${data.user.username}!`);
      } else {
        toast.error(data.error || "Failed to validate Instagram cookie");
      }
    } catch {
      toast.error("Failed to connect to Instagram API");
    } finally {
      setIsValidating(false);
    }
  };

  // Test & Save Cloudinary credentials
  const handleTestCloudinary = async () => {
    if (!cloudName.trim() || !apiKey.trim() || !apiSecret.trim()) {
      toast.error("Please fill in all three Cloudinary fields");
      return;
    }

    setIsTestingCloud(true);
    setCloudError(null);
    setCloudStats(null);
    setCloudConnected(false);

    try {
      const res = await fetch("/api/cloudinary-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cloudName: cloudName.trim(),
          apiKey: apiKey.trim(),
          apiSecret: apiSecret.trim(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        setCloudStats(data.stats ?? null);
        setCloudConnected(true);
        toast.success("Cloudinary connected successfully!");
      } else {
        setCloudError(data.error || "Connection failed");
        toast.error(data.error || "Cloudinary connection failed");
      }
    } catch {
      const msg = "Failed to reach the server";
      setCloudError(msg);
      toast.error(msg);
    } finally {
      setIsTestingCloud(false);
    }
  };

  const handleClearCloudinary = () => {
    setCloudName("");
    setApiKey("");
    setApiSecret("");
    setCloudStats(null);
    setCloudConnected(false);
    setCloudError(null);
  };

  // Mark onboarding as completed
  const markOnboardingComplete = async () => {
    try {
      await fetch("/api/onboarding", { method: "POST" });
    } catch {
      // Non-fatal — the user can still proceed
    }
  };

  // Complete profile setup and proceed
  const handleCreateProfile = async (targetAction: "dashboard" | "scrape") => {
    if (!profileName.trim()) {
      toast.error("Profile name is required");
      return;
    }

    createProfile.mutate(
      {
        name: profileName.trim(),
        cookie: cookie.trim() || undefined,
        userAgent: userAgent.trim() || undefined,
      },
      {
        onSuccess: (newProfile) => {
          selectProfile.mutate(newProfile.id, {
            onSuccess: async () => {
              toast.success("Profile setup complete!");
              await markOnboardingComplete();
              if (targetAction === "scrape") {
                window.location.assign("/scrape");
              } else {
                window.location.assign("/");
              }
            },
            onError: (err) => {
              toast.error(`Error activating profile: ${err.message}`);
            },
          });
        },
        onError: (err) => {
          toast.error(`Failed to create profile: ${err.message}`);
        },
      }
    );
  };

  const storagePercent =
    cloudStats && cloudStats.storageLimit > 0
      ? Math.min(
          100,
          Math.round((cloudStats.storageUsed / cloudStats.storageLimit) * 100)
        )
      : 0;

  return (
    <div className="flex min-h-screen w-full items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl">
        {/* Progress Stepper */}
        <div className="mb-8 flex items-center justify-between">
          {[
            { num: 1, label: "System Check" },
            { num: 2, label: "Connect IG" },
            { num: 3, label: "Cloudinary" },
            { num: 4, label: "Launch" },
          ].map((item, idx) => (
            <div key={item.num} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={`flex size-9 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                    step === item.num
                      ? "bg-primary text-primary-foreground shadow-md ring-4 ring-primary/20"
                      : step > item.num
                        ? "bg-emerald-600 text-white"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {step > item.num ? (
                    <CheckCircle2 className="size-5" />
                  ) : (
                    item.num
                  )}
                </div>
                <span className="mt-1 text-xs font-medium text-muted-foreground hidden sm:block">
                  {item.label}
                </span>
              </div>
              {idx < 3 && (
                <div
                  className={`mx-2 h-0.5 flex-1 transition-all ${
                    step > item.num ? "bg-emerald-600" : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: WELCOME & SYSTEM CHECK */}
        {step === 1 && (
          <Card className="border-border/60 shadow-lg">
            <CardHeader className="text-center">
              <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-6" />
              </div>
              <CardTitle className="text-2xl font-bold">
                Welcome to InstaSave Tracker
              </CardTitle>
              <CardDescription>
                Your self-hosted archive and intelligence dashboard for
                Instagram saved posts. Let&apos;s get your system configured in
                under 2 minutes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-xl border bg-card/50 p-4 space-y-3">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Database className="size-4 text-primary" />
                  System Diagnostics
                </h3>

                <div className="flex items-center justify-between rounded-lg bg-background p-3 border">
                  <div className="flex items-center gap-3">
                    <Database className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">MongoDB Database</p>
                      <p className="text-xs text-muted-foreground">
                        {dbStatus === "connected"
                          ? `Operational (${dbLatency}ms latency)`
                          : dbStatus === "checking"
                            ? "Testing connection..."
                            : "Connection failed. Verify DATABASE_URL."}
                      </p>
                    </div>
                  </div>
                  {dbStatus === "connected" && (
                    <Badge
                      variant="default"
                      className="bg-emerald-600 hover:bg-emerald-600 gap-1"
                    >
                      <CheckCircle2 className="size-3.5" /> Connected
                    </Badge>
                  )}
                  {dbStatus === "checking" && (
                    <Badge variant="outline" className="gap-1">
                      <Loader2 className="size-3.5 animate-spin" /> Checking
                    </Badge>
                  )}
                  {dbStatus === "error" && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertCircle className="size-3.5" /> Error
                    </Badge>
                  )}
                </div>

                <div className="flex items-center justify-between rounded-lg bg-background p-3 border">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="size-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Local Media Cache</p>
                      <p className="text-xs text-muted-foreground">
                        Next.js standalone proxy active
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-muted-foreground">
                    Ready
                  </Badge>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button
                onClick={() => setStep(2)}
                disabled={dbStatus === "checking"}
                className="gap-2"
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 2: CONNECT INSTAGRAM */}
        {step === 2 && (
          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Instagram className="size-5 text-pink-500" />
                Connect Your Instagram Account
              </CardTitle>
              <CardDescription>
                Provide an Instagram session cookie to allow the scraper to
                fetch your saved posts.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profile-name">Profile Name</Label>
                <Input
                  id="profile-name"
                  placeholder="e.g. My Personal Account"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="cookie">Instagram Cookie String</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs text-primary hover:underline gap-1"
                    onClick={() => setShowCookieGuide(!showCookieGuide)}
                  >
                    <HelpCircle className="size-3.5" />
                    {showCookieGuide ? "Hide instructions" : "How to get this?"}
                  </Button>
                </div>

                {showCookieGuide && (
                  <div className="rounded-lg border bg-muted/40 p-4 text-xs space-y-2.5 text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      How to extract your session cookie:
                    </p>
                    <ol className="list-decimal list-inside space-y-1.5 leading-relaxed">
                      <li>
                        Log in to{" "}
                        <a
                          href="https://instagram.com"
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary underline"
                        >
                          instagram.com
                        </a>{" "}
                        on your desktop browser.
                      </li>
                      <li>
                        Open Developer Tools (
                        <kbd className="rounded border px-1 bg-muted">F12</kbd>{" "}
                        or{" "}
                        <kbd className="rounded border px-1 bg-muted">
                          Ctrl+Shift+I
                        </kbd>
                        ).
                      </li>
                      <li>
                        Go to the <strong>Network</strong> tab and refresh the
                        page.
                      </li>
                      <li>
                        Click any request to{" "}
                        <code className="rounded bg-muted px-1">
                          instagram.com
                        </code>{" "}
                        (or filter by{" "}
                        <code className="rounded bg-muted px-1">graphql</code>
                        ).
                      </li>
                      <li>
                        Under <strong>Request Headers</strong>, copy the entire{" "}
                        <strong>Cookie</strong> string.
                      </li>
                    </ol>
                  </div>
                )}

                <Textarea
                  id="cookie"
                  placeholder="sessionid=...; ds_user_id=...; csrftoken=...;"
                  value={cookie}
                  onChange={(e) => {
                    setCookie(e.target.value);
                    if (validatedUser) setValidatedUser(null);
                  }}
                  rows={4}
                  className="font-mono text-xs break-all"
                />

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={handleValidateCookie}
                    disabled={isValidating || !cookie.trim()}
                    className="gap-1.5"
                  >
                    {isValidating ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />{" "}
                        Verifying with Instagram...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="size-3.5" /> Test & Verify
                        Cookie
                      </>
                    )}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground"
                    onClick={() => setShowUa(!showUa)}
                  >
                    {showUa ? "Hide User-Agent" : "Custom User-Agent (Optional)"}
                  </Button>
                </div>
              </div>

              {/* Live Validated Account Preview */}
              {validatedUser && (
                <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 transition-all">
                  <ProfileAvatar
                    name={validatedUser.username}
                    avatarUrl={validatedUser.profilePicUrl}
                    className="size-12 rounded-full border border-emerald-500/40"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate flex items-center gap-1.5">
                      @{validatedUser.username}
                      <CheckCircle2 className="size-4 text-emerald-500 shrink-0" />
                    </p>
                    <p className="text-xs text-muted-foreground">
                      User PK: {validatedUser.pk} &bull; Authentication
                      Successful
                    </p>
                  </div>
                </div>
              )}

              {showUa && (
                <div className="space-y-2 pt-2 border-t">
                  <Label htmlFor="ua" className="text-xs">
                    Custom User-Agent
                  </Label>
                  <Input
                    id="ua"
                    placeholder="Defaults to Instagram Android UA"
                    value={userAgent}
                    onChange={(e) => setUserAgent(e.target.value)}
                    className="font-mono text-xs"
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                onClick={() => {
                  if (!profileName.trim()) {
                    toast.error("Profile name is required");
                    return;
                  }
                  setStep(3);
                }}
                className="gap-2"
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 3: CLOUDINARY SETUP */}
        {step === 3 && (
          <Card className="border-border/60 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cloud className="size-5 text-sky-500" />
                Cloudinary CDN{" "}
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Optional
                </Badge>
              </CardTitle>
              <CardDescription>
                Connect your free Cloudinary account to permanently store media
                — preventing broken images when Instagram CDN links expire. You
                can skip this and configure it later in Settings.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {cloudConnected && cloudStats ? (
                /* Connected stats panel */
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                      <CheckCircle2 className="size-4" />
                      Connected to Cloudinary
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-muted-foreground"
                      onClick={handleClearCloudinary}
                    >
                      <X className="size-3 mr-1" /> Disconnect
                    </Button>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-lg border bg-background p-3 text-center space-y-1">
                      <HardDrive className="size-4 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">Storage</p>
                      <p className="text-xs font-semibold">
                        {formatBytes(cloudStats.storageUsed)}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background p-3 text-center space-y-1">
                      <ImageIcon className="size-4 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">Assets</p>
                      <p className="text-xs font-semibold">
                        {cloudStats.resources.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg border bg-background p-3 text-center space-y-1">
                      <Zap className="size-4 text-muted-foreground mx-auto" />
                      <p className="text-xs text-muted-foreground">Plan</p>
                      <p className="text-xs font-semibold capitalize">
                        {cloudStats.plan}
                      </p>
                    </div>
                  </div>

                  {cloudStats.storageLimit > 0 && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Storage used</span>
                        <span>
                          {formatBytes(cloudStats.storageUsed)} /{" "}
                          {formatBytes(cloudStats.storageLimit)}
                        </span>
                      </div>
                      <Progress value={storagePercent} className="h-1.5" />
                    </div>
                  )}
                </div>
              ) : (
                /* Credentials form */
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="cloud-name">Cloud Name</Label>
                    <Input
                      id="cloud-name"
                      placeholder="e.g. my-cloud"
                      value={cloudName}
                      onChange={(e) => {
                        setCloudName(e.target.value);
                        setCloudError(null);
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <Input
                      id="api-key"
                      placeholder="123456789012345"
                      value={apiKey}
                      onChange={(e) => {
                        setApiKey(e.target.value);
                        setCloudError(null);
                      }}
                      className="font-mono text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-secret">API Secret</Label>
                    <div className="relative">
                      <Input
                        id="api-secret"
                        type={showSecret ? "text" : "password"}
                        placeholder="••••••••••••••••••••••••••"
                        value={apiSecret}
                        onChange={(e) => {
                          setApiSecret(e.target.value);
                          setCloudError(null);
                        }}
                        className="font-mono text-sm pr-10"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                        onClick={() => setShowSecret(!showSecret)}
                      >
                        {showSecret ? (
                          <EyeOff className="size-3.5" />
                        ) : (
                          <Eye className="size-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground">
                    Find these in your{" "}
                    <a
                      href="https://console.cloudinary.com/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary underline"
                    >
                      Cloudinary Console
                    </a>{" "}
                    under Settings → Access keys.
                  </p>

                  {cloudError && (
                    <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      <AlertCircle className="size-3.5 shrink-0" />
                      {cloudError}
                    </div>
                  )}

                  <Button
                    onClick={handleTestCloudinary}
                    disabled={
                      isTestingCloud ||
                      !cloudName.trim() ||
                      !apiKey.trim() ||
                      !apiSecret.trim()
                    }
                    variant="secondary"
                    className="w-full gap-2"
                  >
                    {isTestingCloud ? (
                      <>
                        <Loader2 className="size-4 animate-spin" /> Testing
                        connection...
                      </>
                    ) : (
                      <>
                        <Cloud className="size-4" /> Test & Save Connection
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Fallback option info */}
              {!cloudConnected && (
                <div className="rounded-lg border bg-muted/30 p-3">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      No Cloudinary?
                    </span>{" "}
                    That&apos;s fine! The built-in on-demand proxy will securely
                    stream media through your server. You can always add
                    Cloudinary later in Settings.
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => setStep(2)}
                className="gap-2"
              >
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button onClick={() => setStep(4)} className="gap-2">
                {cloudConnected ? "Continue" : "Skip for Now"}{" "}
                <ArrowRight className="size-4" />
              </Button>
            </CardFooter>
          </Card>
        )}

        {/* STEP 4: LAUNCH */}
        {step === 4 && (
          <Card className="border-border/60 shadow-lg text-center">
            <CardHeader>
              <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                <CheckCircle2 className="size-8" />
              </div>
              <CardTitle className="text-2xl font-bold">
                You&apos;re All Set!
              </CardTitle>
              <CardDescription>
                Your profile <strong>{profileName}</strong> is ready. You can
                start your first scrape right now or explore the dashboard.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="mx-auto max-w-sm rounded-xl border bg-muted/30 p-4 flex items-center gap-3 text-left">
                <ProfileAvatar
                  name={profileName}
                  avatarUrl={validatedUser?.profilePicUrl}
                  className="size-12 rounded-xl"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{profileName}</p>
                  <p className="text-xs text-muted-foreground">
                    {cookie ? "Instagram Session Active" : "No Session Configured"}
                  </p>
                </div>
              </div>

              {/* Summary badges */}
              <div className="flex flex-wrap gap-2 justify-center">
                <Badge
                  variant={cookie ? "default" : "outline"}
                  className={
                    cookie
                      ? "bg-emerald-600 hover:bg-emerald-600 gap-1"
                      : "gap-1 text-muted-foreground"
                  }
                >
                  <Instagram className="size-3" />
                  {cookie ? "Instagram Connected" : "No Instagram Session"}
                </Badge>
                <Badge
                  variant={cloudConnected ? "default" : "outline"}
                  className={
                    cloudConnected
                      ? "bg-sky-600 hover:bg-sky-600 gap-1"
                      : "gap-1 text-muted-foreground"
                  }
                >
                  <Cloud className="size-3" />
                  {cloudConnected ? "Cloudinary CDN Active" : "Proxy Caching (Built-in)"}
                </Badge>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                onClick={() => handleCreateProfile("dashboard")}
                disabled={createProfile.isPending || selectProfile.isPending}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
              <Button
                onClick={() => handleCreateProfile("scrape")}
                disabled={createProfile.isPending || selectProfile.isPending}
                className="w-full sm:w-auto gap-2 bg-primary hover:bg-primary/90"
              >
                {createProfile.isPending || selectProfile.isPending ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Starting...
                  </>
                ) : (
                  <>
                    <Play className="size-4 fill-current" /> Start First Scrape
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        )}
      </div>
    </div>
  );
}
