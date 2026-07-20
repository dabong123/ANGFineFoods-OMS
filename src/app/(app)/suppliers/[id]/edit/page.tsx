import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { getSupplierDetail } from "@/lib/data/suppliers";
import { SupplierForm } from "@/components/suppliers/supplier-form";

export default async function EditSupplierPage({ params }: { params: { id: string } }) {
  await requirePermission("suppliers:manage");
  const supplier = await getSupplierDetail(params.id);
  if (!supplier) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{supplier.name}</h1>
      <SupplierForm mode="edit" supplier={supplier} />
    </div>
  );
}
