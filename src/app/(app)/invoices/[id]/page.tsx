import Link from "next/link";
import { notFound } from "next/navigation";

import { requirePermission } from "@/lib/auth-guard";
import { can } from "@/types";
import { getInvoiceDetail } from "@/lib/data/invoices";
import { formatMoney, formatQuantity } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { RecordPaymentForm } from "@/components/invoices/record-payment-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function InvoiceDetailPage({ params }: { params: { id: string } }) {
  const session = await requirePermission("invoices:view");
  const invoice = await getInvoiceDetail(params.id);
  if (!invoice) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">{invoice.invoiceNumber}</h1>
          <InvoiceStatusBadge status={invoice.status} />
          {invoice.isOverdue && (
            <Badge variant="outline" className="border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
              Overdue
            </Badge>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {invoice.customerName} &middot;{" "}
          <Link href={`/orders/${invoice.orderId}`} className="underline-offset-4 hover:underline">
            {invoice.orderNumber}
          </Link>{" "}
          &middot; {invoice.deliveryNumber}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Delivered items</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Unit price</TableHead>
                <TableHead className="text-right">Line total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.lines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell>
                    <div className="font-medium">{line.productName}</div>
                    <div className="text-xs text-muted-foreground">{line.productSku}</div>
                  </TableCell>
                  <TableCell>
                    {formatQuantity(line.quantity)} {line.unit}
                  </TableCell>
                  <TableCell>{formatMoney(line.unitPrice)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(line.lineTotal)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="mt-4 flex justify-end">
            <div className="w-64 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Issue date</span>
                <span>{new Date(invoice.issueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due date</span>
                <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMoney(invoice.total)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid</span>
                <span>{formatMoney(invoice.amountPaid)}</span>
              </div>
              <div className="flex justify-between font-medium">
                <span>Balance</span>
                <span>{formatMoney(invoice.balance)}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {invoice.payments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payment history</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Recorded by</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoice.payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>{new Date(p.paymentDate).toLocaleDateString()}</TableCell>
                    <TableCell>{p.method ?? "—"}</TableCell>
                    <TableCell>{p.reference ?? "—"}</TableCell>
                    <TableCell>{p.recordedByName}</TableCell>
                    <TableCell className="text-right font-medium">{formatMoney(p.amount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {can(session.user.role, "payments:record") && (
        <RecordPaymentForm invoiceId={invoice.id} balance={invoice.balance} />
      )}
    </div>
  );
}
