import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfilePicker } from "@/components/profiles/profile-picker";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Choose a profile",
};

export default async function ProfilesPage() {
  try {
    const count = await prisma.profile.count();
    if (count === 0) {
      redirect("/onboarding");
    }
  } catch {
    // If DB is unreachable or during build, proceed to picker
  }

  return <ProfilePicker />;
}
