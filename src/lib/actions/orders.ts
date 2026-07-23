"use server";

import { revalidatePath } from "next/cache";
import { prisma, TRANSACTION_OPTIONS } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import {
  createOrderSchema,
  updateOrderSchema,
  updateApprovedOrderSchema,
  type CreateOrderInput,
  type UpdateOrderInput,
  type UpdateApprovedOrderInput,
} from "@/lib/validations/order";
import {
  applyApprovalSideEffects,
  applySideEffectForLine,
  reverseSideEffectForLine,
  generateOrderNumber,
  resolveUnitPrice,
  type StockWarning,
} from "@/lib/order-engine";
import { getCustomerPricesForCustomer } from "@/lib/data/customers";
import { runAction, type ActionResult } from "@/lib/action-result";

type OrderActionResult = {
  orderId: string;
  status: "APPROVED" | "PENDING_APPROVAL";
  warnings: StockWarning[];
};

async function resolveCustomerForActor(
  customerId: string,
  actorRole: string,
  actorId: string
) {
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer || !customer.isActive) {
    throw new Error("Customer not found");
  }
  if (actorRole === "SALES_AGENT" && customer.salesAgentId !== actorId) {
    throw new Error("You can only create orders for your own customers");
  }
  return customer;
}

async function buildLines(
  customerId: string,
  lines: CreateOrderInput["lines"],
  canOverridePricing: boolean
) {
  const built = [];
  let subtotal = 0;

  for (const line of lines) {
    const computedPrice = await resolveUnitPrice(prisma, customerId, line.productId);
    const unitPrice =
      canOverridePricing && line.unitPriceOverride !== undefined
        ? line.unitPriceOverride
        : computedPrice;
    const lineTotal = Math.round(unitPrice * line.quantity * 100) / 100;
    subtotal += lineTotal;

    built.push({
      productId: line.productId,
      quantity: line.quantity,
      isWeightEstimated: line.isWeightEstimated ?? false,
      unitPrice,
      lineTotal,
      fulfillmentSource: line.fulfillmentSource,
      supplierId: line.fulfillmentSource === "SUPPLIER" ? line.supplierId : null,
    });
  }

  return { lines: built, subtotal: Math.round(subtotal * 100) / 100 };
}

export async function createOrder(
  input: CreateOrderInput
): Promise<ActionResult<OrderActionResult>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!can(session.user.role, "orders:create")) {
      throw new Error("Not authorized to create orders");
    }

    const parsed = createOrderSchema.parse(input);
    const customer = await resolveCustomerForActor(
      parsed.customerId,
      session.user.role,
      session.user.id
    );

    const canOverridePricing = can(session.user.role, "pricing:edit");
    const { lines, subtotal } = await buildLines(parsed.customerId, parsed.lines, canOverridePricing);

    const autoApprove = can(session.user.role, "orders:approve");
    const status = autoApprove ? "APPROVED" : "PENDING_APPROVAL";

    const result = await prisma.$transaction(async (tx) => {
      const orderNumber = await generateOrderNumber(tx);

      const order = await tx.order.create({
        data: {
          orderNumber,
          customerId: customer.id,
          salesAgentId: customer.salesAgentId,
          notes: parsed.notes,
          subtotal,
          total: subtotal,
          status,
          ...(autoApprove
            ? { approvedAt: new Date(), approvedById: session.user.id }
            : {}),
          lines: { create: lines },
        },
      });

      const warnings = autoApprove ? await applyApprovalSideEffects(tx, order.id) : [];
      return { orderId: order.id, warnings };
    }, TRANSACTION_OPTIONS);

    revalidatePath("/orders");
    revalidatePath("/dashboard");
    return { orderId: result.orderId, status, warnings: result.warnings };
  });
}

export async function updateOrder(
  input: UpdateOrderInput
): Promise<ActionResult<OrderActionResult>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = updateOrderSchema.parse(input);

    const existing = await prisma.order.findUnique({ where: { id: parsed.orderId } });
    if (!existing) throw new Error("Order not found");

    const isOwnOrder = existing.salesAgentId === session.user.id;
    const allowed =
      (isOwnOrder && can(session.user.role, "orders:edit:own")) ||
      can(session.user.role, "orders:edit:all");
    if (!allowed) throw new Error("Not authorized to edit this order");

    if (existing.status !== "DRAFT" && existing.status !== "PENDING_APPROVAL") {
      throw new Error("Only orders awaiting approval can be edited");
    }

    const customer = await resolveCustomerForActor(
      parsed.customerId,
      session.user.role,
      session.user.id
    );

    const canOverridePricing = can(session.user.role, "pricing:edit");
    const { lines, subtotal } = await buildLines(parsed.customerId, parsed.lines, canOverridePricing);

    const autoApprove = can(session.user.role, "orders:approve");
    const status = autoApprove ? "APPROVED" : "PENDING_APPROVAL";

    const result = await prisma.$transaction(async (tx) => {
      await tx.orderLine.deleteMany({ where: { orderId: existing.id } });
      await tx.order.update({
        where: { id: existing.id },
        data: {
          customerId: customer.id,
          salesAgentId: customer.salesAgentId,
          notes: parsed.notes,
          subtotal,
          total: subtotal,
          status,
          ...(autoApprove
            ? { approvedAt: new Date(), approvedById: session.user.id }
            : { approvedAt: null, approvedById: null }),
          lines: { create: lines },
        },
      });

      const warnings = autoApprove ? await applyApprovalSideEffects(tx, existing.id) : [];
      return { warnings };
    }, TRANSACTION_OPTIONS);

    revalidatePath("/orders");
    revalidatePath(`/orders/${existing.id}`);
    revalidatePath("/dashboard");
    return { orderId: existing.id, status, warnings: result.warnings };
  });
}

export async function updateApprovedOrder(
  input: UpdateApprovedOrderInput
): Promise<ActionResult<{ orderId: string; warnings: StockWarning[] }>> {
  return runAction(async () => {
    const session = await requireSession();
    const parsed = updateApprovedOrderSchema.parse(input);

    const existing = await prisma.order.findUnique({
      where: { id: parsed.orderId },
      include: { lines: { include: { product: true, purchaseRequest: true } } },
    });
    if (!existing) throw new Error("Order not found");

    const isOwnOrder = existing.salesAgentId === session.user.id;
    const allowed =
      (isOwnOrder && can(session.user.role, "orders:edit:own")) ||
      can(session.user.role, "orders:edit:all");
    if (!allowed) throw new Error("Not authorized to edit this order");

    if (existing.status !== "APPROVED" && existing.status !== "PARTIALLY_DELIVERED") {
      throw new Error("Only approved or partially-delivered orders can be edited this way");
    }

    const lockedLineIds = new Set(
      existing.lines
        .filter((l) => l.deliveryId !== null || l.purchaseRequest?.status === "RECEIVED")
        .map((l) => l.id)
    );
    const editableLines = new Map(
      existing.lines.filter((l) => !lockedLineIds.has(l.id)).map((l) => [l.id, l])
    );

    for (const line of parsed.lines) {
      if (line.lineId && !editableLines.has(line.lineId)) {
        throw new Error("One or more lines can no longer be edited — reload the order and try again");
      }
    }

    const canOverridePricing = can(session.user.role, "pricing:edit");
    const warnings: StockWarning[] = [];

    await prisma.$transaction(async (tx) => {
      const submittedIds = new Set(
        parsed.lines.filter((l): l is typeof l & { lineId: string } => !!l.lineId).map((l) => l.lineId)
      );

      // Editable lines that dropped out of the submission were removed —
      // reverse whatever stock deduction / purchase request they caused.
      for (const [id, line] of editableLines) {
        if (submittedIds.has(id)) continue;
        await reverseSideEffectForLine(tx, line);
        await tx.orderLine.delete({ where: { id } });
      }

      for (const line of parsed.lines) {
        const computedPrice = await resolveUnitPrice(tx, existing.customerId, line.productId);
        const unitPrice =
          canOverridePricing && line.unitPriceOverride !== undefined
            ? line.unitPriceOverride
            : computedPrice;
        const lineTotal = Math.round(unitPrice * line.quantity * 100) / 100;
        const supplierId = line.fulfillmentSource === "SUPPLIER" ? line.supplierId ?? null : null;

        if (line.lineId) {
          const before = editableLines.get(line.lineId)!;
          const unchanged =
            before.productId === line.productId &&
            before.quantity.toNumber() === line.quantity &&
            before.fulfillmentSource === line.fulfillmentSource &&
            (before.supplierId ?? null) === supplierId &&
            before.unitPrice.toNumber() === unitPrice;
          if (unchanged) continue;

          await reverseSideEffectForLine(tx, before);
          await tx.orderLine.update({
            where: { id: line.lineId },
            data: {
              productId: line.productId,
              quantity: line.quantity,
              unitPrice,
              lineTotal,
              fulfillmentSource: line.fulfillmentSource,
              supplierId,
              stockDeducted: false,
              isWeightEstimated: false,
            },
          });
          const updated = await tx.orderLine.findUniqueOrThrow({
            where: { id: line.lineId },
            include: { product: true },
          });
          const warning = await applySideEffectForLine(tx, updated);
          if (warning) warnings.push(warning);
        } else {
          const created = await tx.orderLine.create({
            data: {
              orderId: existing.id,
              productId: line.productId,
              quantity: line.quantity,
              unitPrice,
              lineTotal,
              fulfillmentSource: line.fulfillmentSource,
              supplierId,
            },
            include: { product: true },
          });
          const warning = await applySideEffectForLine(tx, created);
          if (warning) warnings.push(warning);
        }
      }

      const allLines = await tx.orderLine.findMany({ where: { orderId: existing.id } });
      const subtotal = allLines.reduce((sum, l) => sum + l.lineTotal.toNumber(), 0);
      const total = Math.round(subtotal * 100) / 100;

      await tx.order.update({
        where: { id: existing.id },
        data: { notes: parsed.notes, subtotal: total, total },
      });
    }, TRANSACTION_OPTIONS);

    revalidatePath("/orders");
    revalidatePath(`/orders/${existing.id}`);
    revalidatePath("/dashboard");
    revalidatePath("/purchase-requests");
    return { orderId: existing.id, warnings };
  });
}

export async function approveOrder(orderId: string): Promise<ActionResult<{ warnings: StockWarning[] }>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!can(session.user.role, "orders:approve")) {
      throw new Error("Not authorized to approve orders");
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");
    if (order.status !== "PENDING_APPROVAL") {
      throw new Error("Only orders pending approval can be approved");
    }

    const warnings = await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: { status: "APPROVED", approvedAt: new Date(), approvedById: session.user.id },
      });
      return applyApprovalSideEffects(tx, orderId);
    }, TRANSACTION_OPTIONS);

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    revalidatePath("/dashboard");
    return { warnings };
  });
}

export async function cancelOrder(orderId: string): Promise<ActionResult> {
  return runAction(async () => {
    const session = await requireSession();

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new Error("Order not found");

    const isOwnOrder = order.salesAgentId === session.user.id;
    const allowed =
      (isOwnOrder && can(session.user.role, "orders:cancel:own")) ||
      can(session.user.role, "orders:cancel:all");
    if (!allowed) throw new Error("Not authorized to cancel this order");

    if (order.status !== "DRAFT" && order.status !== "PENDING_APPROVAL") {
      throw new Error(
        "Only orders awaiting approval can be cancelled from here — approved orders already moved stock/purchase requests and need manual reversal."
      );
    }

    await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: new Date() },
    });

    revalidatePath("/orders");
    revalidatePath(`/orders/${orderId}`);
    return {};
  });
}

export async function getCustomerPricesAction(
  customerId: string
): Promise<Record<string, number>> {
  const session = await requireSession();
  const customer = await prisma.customer.findUnique({ where: { id: customerId } });
  if (!customer) throw new Error("Customer not found");
  if (session.user.role === "SALES_AGENT" && customer.salesAgentId !== session.user.id) {
    throw new Error("Not authorized");
  }
  return getCustomerPricesForCustomer(customerId);
}
