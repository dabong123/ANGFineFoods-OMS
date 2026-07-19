import { prisma } from "@/lib/prisma";
import type { PurchaseRequestListItemDTO } from "@/types/dto";

export async function getPurchaseRequests(): Promise<PurchaseRequestListItemDTO[]> {
  const prs = await prisma.purchaseRequest.findMany({
    include: {
      product: { select: { name: true, sku: true, unit: true } },
      supplier: { select: { name: true } },
      orderLine: { select: { order: { select: { id: true, orderNumber: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return prs.map((pr) => ({
    id: pr.id,
    orderId: pr.orderLine.order.id,
    orderNumber: pr.orderLine.order.orderNumber,
    productName: pr.product.name,
    productSku: pr.product.sku,
    unit: pr.product.unit,
    supplierName: pr.supplier.name,
    quantity: pr.quantity.toNumber(),
    status: pr.status,
    expectedDate: pr.expectedDate?.toISOString() ?? null,
    receivedAt: pr.receivedAt?.toISOString() ?? null,
    createdAt: pr.createdAt.toISOString(),
  }));
}
