import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveProfile } from "@/lib/active-profile";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get Started | InstaSave Tracker",
};

export default async function OnboardingPage() {
  try {
    const profileCount = await prisma.profile.count();
    if (profileCount > 0) {
      const active = await getActiveProfile();
      if (active) {
        redirect("/");
      } else {
        redirect("/profiles");
      }
    }
  } catch {
    // If DB is unreachable or during build, allow rendering wizard
  }

  return <OnboardingWizard />;
}
