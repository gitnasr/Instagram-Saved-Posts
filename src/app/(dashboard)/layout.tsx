import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh bg-background">
      <Sidebar />
      <main
        data-dashboard-scroll
        className="h-dvh flex-1 overflow-y-auto px-4 py-4 pb-24 sm:px-6 sm:py-6 md:pb-6"
      >
        {children}
      </main>
    </div>
  );
}
