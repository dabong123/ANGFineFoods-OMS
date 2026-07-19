import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { getProductDetail } from "@/lib/data/products";
import { ProductForm } from "@/components/products/product-form";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  await requirePermission("products:manage");
  const product = await getProductDetail(params.id);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
      <ProductForm mode="edit" product={product} />
    </div>
  );
}
