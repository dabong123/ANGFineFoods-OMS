import { requirePermission } from "@/lib/auth-guard";
import { ProductForm } from "@/components/products/product-form";

export default async function NewProductPage() {
  await requirePermission("products:manage");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
      <ProductForm mode="create" />
    </div>
  );
}
