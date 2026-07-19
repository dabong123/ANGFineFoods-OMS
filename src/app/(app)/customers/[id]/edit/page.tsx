import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { getAssignableAgents, getCustomerDetailForSession } from "@/lib/data/customers";
import { CustomerForm } from "@/components/customers/customer-form";

export default async function EditCustomerPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const customer = await getCustomerDetailForSession(session, params.id);
  if (!customer) notFound();

  const isOwnCustomer = customer.salesAgentId === session.user.id;
  const canEdit =
    (isOwnCustomer && can(session.user.role, "customers:edit:own")) ||
    can(session.user.role, "customers:edit:all");
  if (!canEdit) {
    redirect("/customers");
  }

  const canAssignAgent = can(session.user.role, "customers:edit:all");
  const assignableAgents = canAssignAgent ? await getAssignableAgents() : [];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{customer.name}</h1>
      <CustomerForm
        mode="edit"
        customer={customer}
        canAssignAgent={canAssignAgent}
        assignableAgents={assignableAgents}
      />
    </div>
  );
}
