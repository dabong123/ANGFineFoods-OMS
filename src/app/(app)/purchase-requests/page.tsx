import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { getPurchaseRequests } from "@/lib/data/purchase-requests";
import { formatQuantity } from "@/lib/format";
import { PurchaseRequestActions } from "@/components/purchase-requests/purchase-request-actions";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function PurchaseRequestsPage() {
  await requirePermission("purchaseRequests:manage");
  const requests = await getPurchaseRequests();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Purchase Requests</h1>

      {requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No purchase requests yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.map((pr) => (
                <TableRow key={pr.id}>
                  <TableCell>
                    <Link href={`/orders/${pr.orderId}`} className="text-primary underline-offset-4 hover:underline">
                      {pr.orderNumber}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{pr.productName}</div>
                    <div className="text-xs text-muted-foreground">{pr.productSku}</div>
                  </TableCell>
                  <TableCell>{pr.supplierName}</TableCell>
                  <TableCell>
                    {formatQuantity(pr.quantity)} {pr.unit}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{pr.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <PurchaseRequestActions id={pr.id} status={pr.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
