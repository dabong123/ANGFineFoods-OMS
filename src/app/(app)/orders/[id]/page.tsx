import Link from "next/link";
import { notFound } from "next/navigation";

import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { getOrderDetailForSession } from "@/lib/data/orders";
import { formatMoney, formatQuantity } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { OrderActionsPanel } from "@/components/orders/order-actions-panel";
import { DeliveriesList } from "@/components/deliveries/deliveries-list";
import { CreateDeliveryPanel } from "@/components/deliveries/create-delivery-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await requireSession();
  const order = await getOrderDetailForSession(session, params.id);
  if (!order) notFound();

  const isOwnOrder = order.salesAgentId === session.user.id;
  const canEdit =
    (order.status === "DRAFT" || order.status === "PENDING_APPROVAL") &&
    ((isOwnOrder && can(session.user.role, "orders:edit:own")) ||
      can(session.user.role, "orders:edit:all"));
  const canCancel =
    (order.status === "DRAFT" || order.status === "PENDING_APPROVAL") &&
    ((isOwnOrder && can(session.user.role, "orders:cancel:own")) ||
      can(session.user.role, "orders:cancel:all"));
  const canApprove = order.status === "PENDING_APPROVAL" && can(session.user.role, "orders:approve");
  const canCreateDelivery =
    (order.status === "APPROVED" || order.status === "PARTIALLY_DELIVERED") &&
    can(session.user.role, "deliveries:create");
  const undeliveredLines = order.lines.filter((l) => !l.deliveryId);

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {order.customerName} &middot; {new Date(order.orderDate).toLocaleDateString()} &middot;
            {" "}
            {order.salesAgentName}
          </p>
        </div>
        {canEdit && (
          <Button variant="outline" asChild>
            <Link href={`/orders/${order.id}/edit`}>Edit</Link>
          </Button>
        )}
      </div>

      {order.notes && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Notes</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">{order.notes}</CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Line items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead>Fulfillment</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="font-medium">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">{line.productSku}</div>
                  </TableCell>
                  <TableCell>
                    {formatQuantity(line.quantity)} {line.unit}
                  </TableCell>
                  <TableCell>{formatMoney(line.unitPrice)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1">
                      <Badge variant="secondary" className="w-fit">
                        {line.fulfillmentSource === "STORAGE" ? "Storage" : "Supplier"}
                      </Badge>
                      {line.fulfillmentSource === "STORAGE" && line.stockDeducted && (
                        <span className="text-xs text-muted-foreground">Stock deducted</span>
                      )}
                      {line.fulfillmentSource === "SUPPLIER" && (
                        <span className="text-xs text-muted-foreground">
                          {line.supplierName}
                          {line.purchaseRequestStatus ? ` · PR ${line.purchaseRequestStatus}` : ""}
                        </span>
                      )}
                      {line.deliveryId ? (
                        <Badge variant="outline" className="w-fit text-xs">
                          Delivered
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="w-fit text-xs text-muted-foreground">
                          Not delivered
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatMoney(line.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMoney(order.total)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {order.approvedAt && (
        <p className="text-sm text-muted-foreground">
          Approved by {order.approvedByName} on {new Date(order.approvedAt).toLocaleString()}
        </p>
      )}

      <OrderActionsPanel orderId={order.id} canApprove={canApprove} canCancel={canCancel} />

      <DeliveriesList deliveries={order.deliveries} />

      {canCreateDelivery && (
        <CreateDeliveryPanel
          key={undeliveredLines.map((l) => l.id).join(",")}
          orderId={order.id}
          undeliveredLines={undeliveredLines}
        />
      )}
    </div>
  );
}
