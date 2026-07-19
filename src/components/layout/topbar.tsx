import type { Role } from "@prisma/client";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  SALES_AGENT: "Sales Agent",
  ACCOUNTING: "Accounting",
};

export function Topbar({ name, role }: { name: string; role: Role }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-4 sm:px-6">
      <MobileNav role={role} />
      <div className="flex items-center gap-2 sm:gap-3">
        <span className="hidden text-sm font-medium sm:inline">{name}</span>
        <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
        <SignOutButton />
      </div>
    </header>
  );
}
