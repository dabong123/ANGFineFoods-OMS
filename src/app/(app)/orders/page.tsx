import Link from "next/link";
import { Plus } from "lucide-react";

import { requireAnyPermission } from "@/lib/auth-guard";
import { can } from "@/types";
import { getOrdersForSession } from "@/lib/data/orders";
import { OrdersTable } from "@/components/orders/orders-table";
import { Button } from "@/components/ui/button";

export default async function OrdersPage() {
  const session = await requireAnyPermission(["orders:view:own", "orders:view:all"]);
  const orders = await getOrdersForSession(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        {can(session.user.role, "orders:create") && (
          <Button asChild>
            <Link href="/orders/new">
              <Plus className="mr-1.5 h-4 w-4" /> New order
            </Link>
          </Button>
        )}
      </div>
      <OrdersTable orders={orders} />
    </div>
  );
}
