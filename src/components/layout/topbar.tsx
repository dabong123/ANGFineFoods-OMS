import { SignOutButton } from "@/components/auth/sign-out-button";
import { Badge } from "@/components/ui/badge";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  SALES_AGENT: "Sales Agent",
  ACCOUNTING: "Accounting",
};

export function Topbar({ name, role }: { name: string; role: string }) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border px-6">
      <div />
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium">{name}</span>
        <Badge variant="secondary">{ROLE_LABELS[role] ?? role}</Badge>
        <SignOutButton />
      </div>
    </header>
  );
}
