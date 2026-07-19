import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { getAssignableAgents } from "@/lib/data/customers";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function NewCustomerPage() {
  const session = await requireSession();
  if (!can(session.user.role, "customers:create")) {
    redirect("/customers");
  }

  const canAssignAgent = can(session.user.role, "customers:edit:all");
  const assignableAgents = canAssignAgent ? await getAssignableAgents() : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New customer</h1>
      <CustomerForm mode="create" canAssignAgent={canAssignAgent} assignableAgents={assignableAgents} />
    </div>
  );
}
