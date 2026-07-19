"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  generateDeliveryNumber,
  generateInvoiceNumber,
} from "@/lib/delivery-engine";

export async function createDelivery(
  orderId: string,
  lineIds: string[]
): Promise<{ deliveryId: string; invoiceId: string }> {
  const session = await requireSession();
  if (!can(session.user.role, "deliveries:create")) {
    throw new Error("Not authorized to create deliveries");
  }
  if (lineIds.length === 0) {
    throw new Error("Select at least one line to deliver");
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { lines: { include: { purchaseRequest: true, product: true } } },
  });
  if (!order) throw new Error("Order not found");
  if (order.status !== "APPROVED" && order.status !== "PARTIALLY_DELIVERED") {
    throw new Error("Only approved orders can be delivered");
  }

  const selectedLines = order.lines.filter((l) => lineIds.includes(l.id));
  if (selectedLines.length !== lineIds.length) {
    throw new Error("One or more selected lines don't belong to this order");
  }
  for (const line of selectedLines) {
    if (line.deliveryId) {
      throw new Error(`${line.product.name} has already been delivered`);
    }
    if (line.fulfillmentSource === "SUPPLIER" && line.purchaseRequest?.status !== "RECEIVED") {
      throw new Error(
        `${line.product.name} is supplier-fulfilled and hasn't been marked received from the supplier yet`
      );
    }
  }

  const subtotal = selectedLines.reduce((sum, l) => sum + l.lineTotal.toNumber(), 0);
  const total = Math.round(subtotal * 100) / 100;
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + DEFAULT_PAYMENT_TERMS_DAYS);

  const result = await prisma.$transaction(async (tx) => {
    const deliveryNumber = await generateDeliveryNumber(tx);
    const delivery = await tx.delivery.create({
      data: {
        deliveryNumber,
        orderId: order.id,
        status: "DELIVERED",
        deliveredAt: new Date(),
      },
    });

    await tx.orderLine.updateMany({
      where: { id: { in: lineIds } },
      data: { deliveryId: delivery.id },
    });

    const invoiceNumber = await generateInvoiceNumber(tx);
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        orderId: order.id,
        deliveryId: delivery.id,
        customerId: order.customerId,
        dueDate,
        subtotal: total,
        total,
        balance: total,
      },
    });

    const remaining = await tx.orderLine.count({
      where: { orderId: order.id, deliveryId: null },
    });
    await tx.order.update({
      where: { id: order.id },
      data: { status: remaining === 0 ? "DELIVERED" : "PARTIALLY_DELIVERED" },
    });

    return { deliveryId: delivery.id, invoiceId: invoice.id };
  });

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/invoices");
  revalidatePath("/reports");
  return result;
}
