import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { getCustomersForSession } from "@/lib/data/customers";
import { getActiveProducts } from "@/lib/data/products";
import { getActiveSuppliers } from "@/lib/data/suppliers";
import { OrderForm } from "@/components/orders/order-form";

export default async function NewOrderPage() {
  const session = await requireSession();
  if (!can(session.user.role, "orders:create")) {
    redirect("/orders");
  }

  const [customers, products, suppliers] = await Promise.all([
    getCustomersForSession(session),
    getActiveProducts(),
    getActiveSuppliers(),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New order</h1>
      <OrderForm
        mode="create"
        customers={customers}
        products={products}
        suppliers={suppliers}
        canOverridePricing={can(session.user.role, "pricing:edit")}
      />
    </div>
  );
}
