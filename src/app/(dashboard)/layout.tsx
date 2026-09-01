import { redirect } from "next/navigation";
import { getActiveProfile } from "@/lib/active-profile";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/layout/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getActiveProfile();
  if (!profile) {
    try {
      const profileCount = await prisma.profile.count();
      if (profileCount === 0) {
        redirect("/onboarding");
      }
    } catch {
      // If DB is unreachable or during build, proceed to /profiles
    }
    redirect("/profiles");
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar />
      <main
        data-dashboard-scroll
        className="h-dvh min-w-0 flex-1 overflow-y-auto px-4 py-4 pb-24 sm:px-6 sm:py-6 md:pb-6"
      >
        {children}
      </main>
    </div>
  );
}
