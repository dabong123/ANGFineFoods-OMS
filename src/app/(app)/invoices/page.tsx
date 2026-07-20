import Link from "next/link";
import { requirePermission } from "@/lib/auth-guard";
import { can } from "@/types";
import { getInvoices } from "@/lib/data/invoices";
import { formatMoney } from "@/lib/format";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { InvoiceStatusSelect } from "@/components/invoices/invoice-status-select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function InvoicesPage() {
  const session = await requirePermission("invoices:view");
  const canEdit = can(session.user.role, "invoices:edit");
  const invoices = await getInvoices();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>

      {invoices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No invoices yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Due date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="p-0">
                    <Link href={`/invoices/${inv.id}`} className="block px-3 py-3 font-medium">
                      {inv.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{inv.orderNumber}</TableCell>
                  <TableCell>{inv.customerName}</TableCell>
                  <TableCell>
                    {new Date(inv.dueDate).toLocaleDateString()}
                    {inv.isOverdue && (
                      <Badge variant="outline" className="ml-2 border-transparent bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300">
                        Overdue
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(inv.total)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(inv.balance)}</TableCell>
                  <TableCell>
                    {canEdit ? (
                      <InvoiceStatusSelect invoiceId={inv.id} status={inv.status} />
                    ) : (
                      <InvoiceStatusBadge status={inv.status} />
                    )}
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
