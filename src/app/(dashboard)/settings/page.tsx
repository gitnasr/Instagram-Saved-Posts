"use client";

import { Header } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { CookieInput } from "@/components/settings/cookie-input";
import { UserAgentInput } from "@/components/settings/user-agent-input";
import { CloudinarySettings } from "@/components/settings/cloudinary-settings";
import { useSettings } from "@/hooks/use-settings";

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings();

  const cookieSetting = settings?.find((s) => s.key === "instagram_cookie");
  const userAgentSetting = settings?.find((s) => s.key === "user_agent");

  return (
    <div className="space-y-6">
      <Header
        title="Settings"
        description="Configure your Instagram API credentials"
      />

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Instagram Cookie</CardTitle>
            </CardHeader>
            <CardContent>
              <CookieInput currentValue={cookieSetting?.value} />
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>User-Agent</CardTitle>
            </CardHeader>
            <CardContent>
              <UserAgentInput currentValue={userAgentSetting?.value} />
            </CardContent>
          </Card>

          <Separator />

          <CloudinarySettings />
        </div>
      )}
    </div>
  );
}
