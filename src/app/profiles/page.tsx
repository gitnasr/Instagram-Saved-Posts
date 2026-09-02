import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfilePicker } from "@/components/profiles/profile-picker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose a profile",
};

export default async function ProfilesPage() {
  try {
    const [onboardingSetting, count] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "onboardingCompleted" } }),
      prisma.profile.count(),
    ]);

    if (onboardingSetting?.value !== "true" || count === 0) {
      redirect("/onboarding");
    }
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    // If DB is unreachable or during build, proceed to picker
  }

  return <ProfilePicker />;
}
