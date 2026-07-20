import { requirePermission } from "@/lib/auth-guard";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function NewSupplierPage() {
  await requirePermission("suppliers:manage");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New supplier</h1>
      <SupplierForm mode="create" />
    </div>
  );
}
