import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen flex-1">
      <Sidebar role={session.user.role} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={session.user.name ?? session.user.email ?? ""} role={session.user.role} />
        <main className="min-w-0 flex-1 overflow-x-hidden bg-muted/20 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
