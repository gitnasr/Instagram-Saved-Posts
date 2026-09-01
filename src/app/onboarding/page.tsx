import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get Started | InstaSave Tracker",
};

export default async function OnboardingPage() {
  try {
    // If onboarding is already completed and a profile exists, redirect to dashboard
    const [onboardingSetting, profileCount] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "onboardingCompleted" } }),
      prisma.profile.count(),
    ]);

    if (onboardingSetting?.value === "true" && profileCount > 0) {
      redirect("/");
    }
  } catch {
    // If DB is unreachable or during build, allow rendering wizard
  }

  return <OnboardingWizard />;
}
