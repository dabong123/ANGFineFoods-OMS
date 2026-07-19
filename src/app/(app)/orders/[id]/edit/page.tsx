import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { getOrderDetailForSession } from "@/lib/data/orders";
import { getCustomersForSession } from "@/lib/data/customers";
import { getActiveProducts } from "@/lib/data/products";
import { getActiveSuppliers } from "@/lib/data/suppliers";
import { OrderForm } from "@/components/orders/order-form";

export default async function EditOrderPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const order = await getOrderDetailForSession(session, params.id);
  if (!order) notFound();

  const isOwnOrder = order.salesAgentId === session.user.id;
  const canEdit =
    (order.status === "DRAFT" || order.status === "PENDING_APPROVAL") &&
    ((isOwnOrder && can(session.user.role, "orders:edit:own")) ||
      can(session.user.role, "orders:edit:all"));
  if (!canEdit) {
    redirect(`/orders/${order.id}`);
  }

  const [customers, products, suppliers] = await Promise.all([
    getCustomersForSession(session),
    getActiveProducts(),
    getActiveSuppliers(),
  ]);

  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Edit {order.orderNumber}</h1>
      <OrderForm
        mode="edit"
        order={order}
        customers={customers}
        products={products}
        suppliers={suppliers}
        canOverridePricing={can(session.user.role, "pricing:edit")}
      />
    </div>
  );
}
