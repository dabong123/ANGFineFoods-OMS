"use server";

import { revalidatePath } from "next/cache";
import { prisma, TRANSACTION_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import {
  DEFAULT_PAYMENT_TERMS_DAYS,
  generateDeliveryNumber,
  generateInvoiceNumber,
} from "@/lib/delivery-engine";
import { runAction, type ActionResult } from "@/lib/action-result";

export async function createDelivery(
  orderId: string,
  lineIds: string[],
  actualQuantities: Record<string, number> = {}
): Promise<ActionResult<{ deliveryId: string; invoiceId: string }>> {
  return runAction(async () => {
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
      if (line.isWeightEstimated) {
        const actual = actualQuantities[line.id];
        if (!actual || actual <= 0) {
          throw new Error(`Enter the actual weight for ${line.product.name}`);
        }
      }
    }

    // Resolve each selected line's final quantity/total — estimated-weight
    // lines get corrected to the actual weight confirmed at delivery time;
    // everything else ships at whatever was on the order.
    const resolvedLines = selectedLines.map((line) => {
      const isCorrected = line.isWeightEstimated && actualQuantities[line.id] !== undefined;
      const quantity = isCorrected ? actualQuantities[line.id] : line.quantity.toNumber();
      const lineTotal = isCorrected
        ? Math.round(quantity * line.unitPrice.toNumber() * 100) / 100
        : line.lineTotal.toNumber();
      return { line, isCorrected, quantity, lineTotal };
    });

    const subtotal = resolvedLines.reduce((sum, r) => sum + r.lineTotal, 0);
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

      let orderTotalDelta = 0;
      for (const { line, isCorrected, quantity, lineTotal } of resolvedLines) {
        if (!isCorrected) continue;

        const quantityDelta = quantity - line.quantity.toNumber();
        orderTotalDelta += lineTotal - line.lineTotal.toNumber();

        await tx.orderLine.update({
          where: { id: line.id },
          data: { quantity, lineTotal, isWeightEstimated: false },
        });

        if (line.fulfillmentSource === "STORAGE" && line.product.trackInventory && line.stockDeducted) {
          await tx.product.update({
            where: { id: line.productId },
            data: { currentStock: { decrement: quantityDelta } },
          });
          await tx.inventoryTransaction.create({
            data: {
              productId: line.productId,
              type: "ADJUSTMENT",
              quantity: -quantityDelta,
              note: `Actual weight confirmed at delivery for order line ${line.id}`,
            },
          });
        } else if (line.fulfillmentSource === "SUPPLIER" && line.purchaseRequest) {
          await tx.purchaseRequest.update({
            where: { id: line.purchaseRequest.id },
            data: { quantity },
          });
        }
      }

      if (orderTotalDelta !== 0) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            subtotal: { increment: Math.round(orderTotalDelta * 100) / 100 },
            total: { increment: Math.round(orderTotalDelta * 100) / 100 },
          },
        });
      }

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
    }, TRANSACTION_OPTIONS);

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/invoices");
    revalidatePath("/reports");
    return result;
  });
}
