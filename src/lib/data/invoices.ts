import { prisma } from "@/lib/prisma";
import { computeAgingBucket, isOverdue } from "@/lib/delivery-engine";
import type { ArAgingSummary, InvoiceDetailDTO, InvoiceListItemDTO } from "@/types/dto";

export async function getInvoices(): Promise<InvoiceListItemDTO[]> {
  const invoices = await prisma.invoice.findMany({
    include: {
      order: { select: { orderNumber: true } },
      customer: { select: { name: true } },
    },
    orderBy: { issueDate: "desc" },
  });

  const now = new Date();
  return invoices.map((inv) => {
    const balance = inv.balance.toNumber();
    const overdue = isOverdue(inv.dueDate, balance, now);
    return {
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      orderNumber: inv.order.orderNumber,
      customerName: inv.customer.name,
      issueDate: inv.issueDate.toISOString(),
      dueDate: inv.dueDate.toISOString(),
      total: inv.total.toNumber(),
      balance,
      status: inv.status,
      isOverdue: overdue,
      agingBucket: balance > 0 && inv.status !== "VOID" ? computeAgingBucket(inv.dueDate, now) : null,
    };
  });
}

export async function getInvoiceDetail(invoiceId: string): Promise<InvoiceDetailDTO | null> {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: {
      order: { select: { id: true, orderNumber: true } },
      delivery: {
        select: {
          id: true,
          deliveryNumber: true,
          lines: {
            include: {
              product: { select: { name: true, sku: true, unit: true } },
              supplier: { select: { name: true } },
              purchaseRequest: { select: { id: true, status: true } },
            },
          },
        },
      },
      customer: { select: { name: true } },
      payments: {
        include: { recordedBy: { select: { name: true } } },
        orderBy: { paymentDate: "desc" },
      },
    },
  });
  if (!invoice) return null;

  const balance = invoice.balance.toNumber();

  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    orderId: invoice.order.id,
    orderNumber: invoice.order.orderNumber,
    deliveryId: invoice.delivery.id,
    deliveryNumber: invoice.delivery.deliveryNumber,
    customerName: invoice.customer.name,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate.toISOString(),
    subtotal: invoice.subtotal.toNumber(),
    total: invoice.total.toNumber(),
    amountPaid: invoice.amountPaid.toNumber(),
    balance,
    status: invoice.status,
    isOverdue: isOverdue(invoice.dueDate, balance),
    lines: invoice.delivery.lines.map((line) => ({
      id: line.id,
      productId: line.productId,
      productName: line.product.name,
      productSku: line.product.sku,
      unit: line.product.unit,
      quantity: line.quantity.toNumber(),
      unitPrice: line.unitPrice.toNumber(),
      lineTotal: line.lineTotal.toNumber(),
      fulfillmentSource: line.fulfillmentSource,
      supplierId: line.supplierId,
      supplierName: line.supplier?.name ?? null,
      stockDeducted: line.stockDeducted,
      purchaseRequestId: line.purchaseRequest?.id ?? null,
      purchaseRequestStatus: line.purchaseRequest?.status ?? null,
      deliveryId: line.deliveryId,
    })),
    payments: invoice.payments.map((p) => ({
      id: p.id,
      amount: p.amount.toNumber(),
      paymentDate: p.paymentDate.toISOString(),
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      recordedByName: p.recordedBy.name,
    })),
  };
}

export async function getArAgingSummary(): Promise<ArAgingSummary> {
  const invoices = await prisma.invoice.findMany({
    where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
    select: { dueDate: true, balance: true },
  });

  const now = new Date();
  const buckets: ArAgingSummary["buckets"] = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };

  let totalOutstanding = 0;
  for (const inv of invoices) {
    const balance = inv.balance.toNumber();
    totalOutstanding += balance;
    buckets[computeAgingBucket(inv.dueDate, now)] += balance;
  }

  return {
    buckets,
    totalOutstanding: Math.round(totalOutstanding * 100) / 100,
    invoiceCount: invoices.length,
  };
}
