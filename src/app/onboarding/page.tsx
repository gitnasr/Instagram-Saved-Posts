import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  OnboardingWizard,
  type OnboardingVariant,
} from "@/components/onboarding/onboarding-wizard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Get Started | InstaSave Tracker",
};

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ variant?: string | string[] }>;
}) {
  const params = await searchParams;
  const requestedVariant = Array.isArray(params.variant)
    ? params.variant[0]
    : params.variant;
  const prototypeVariant: OnboardingVariant | null =
    process.env.NODE_ENV !== "production" &&
    (requestedVariant === "A" ||
      requestedVariant === "B" ||
      requestedVariant === "C")
      ? requestedVariant
      : null;

  try {
    // If onboarding is already completed and a profile exists, redirect to dashboard
    const [onboardingSetting, profileCount] = await Promise.all([
      prisma.setting.findUnique({ where: { key: "onboardingCompleted" } }),
      prisma.profile.count(),
    ]);

    if (onboardingSetting?.value === "true" && profileCount > 0) {
      redirect("/");
    }
  } catch (e) {
    if (e && typeof e === "object" && "digest" in e && typeof (e as { digest: unknown }).digest === "string" && (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
      throw e;
    }
    // If DB is unreachable or during build, allow rendering wizard
  }

  return <OnboardingWizard prototypeVariant={prototypeVariant} />;
}
