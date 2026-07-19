import { prisma } from "@/lib/prisma";
import type { OrderDetailDTO, OrderListItemDTO } from "@/types/dto";
import type { Session } from "next-auth";

function scopeForSession(session: Session) {
  return session.user.role === "SALES_AGENT"
    ? { salesAgentId: session.user.id }
    : {};
}

export async function getOrdersForSession(session: Session): Promise<OrderListItemDTO[]> {
  const orders = await prisma.order.findMany({
    where: scopeForSession(session),
    include: {
      customer: { select: { name: true } },
      salesAgent: { select: { name: true } },
      _count: { select: { lines: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber,
    customerName: o.customer.name,
    salesAgentName: o.salesAgent.name,
    status: o.status,
    orderDate: o.orderDate.toISOString(),
    total: o.total.toNumber(),
    lineCount: o._count.lines,
  }));
}

export async function getOrderDetailForSession(
  session: Session,
  orderId: string
): Promise<OrderDetailDTO | null> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { name: true } },
      salesAgent: { select: { name: true } },
      approvedBy: { select: { name: true } },
      lines: {
        include: {
          product: { select: { name: true, sku: true, unit: true } },
          supplier: { select: { name: true } },
          purchaseRequest: { select: { status: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!order) return null;
  if (session.user.role === "SALES_AGENT" && order.salesAgentId !== session.user.id) {
    return null;
  }

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    orderDate: order.orderDate.toISOString(),
    notes: order.notes,
    subtotal: order.subtotal.toNumber(),
    total: order.total.toNumber(),
    customerId: order.customerId,
    customerName: order.customer.name,
    salesAgentId: order.salesAgentId,
    salesAgentName: order.salesAgent.name,
    approvedAt: order.approvedAt?.toISOString() ?? null,
    approvedByName: order.approvedBy?.name ?? null,
    cancelledAt: order.cancelledAt?.toISOString() ?? null,
    lines: order.lines.map((line) => ({
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
      purchaseRequestStatus: line.purchaseRequest?.status ?? null,
    })),
  };
}
