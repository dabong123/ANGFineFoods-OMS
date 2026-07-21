import { Prisma } from "@prisma/client";

type Tx = Prisma.TransactionClient;

export async function generateOrderNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `ORD-${year}-`;
  const count = await tx.order.count({
    where: { orderNumber: { startsWith: prefix } },
  });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

/** Customer-specific price if one exists, else the product's default price. */
export async function resolveUnitPrice(
  tx: Tx,
  customerId: string,
  productId: string
): Promise<number> {
  const override = await tx.customerProductPrice.findUnique({
    where: { customerId_productId: { customerId, productId } },
  });
  if (override) return override.price.toNumber();

  const product = await tx.product.findUniqueOrThrow({ where: { id: productId } });
  return product.defaultSellingPrice.toNumber();
}

export type StockWarning = {
  productId: string;
  productName: string;
  resultingStock: number;
};

type LineWithProduct = Prisma.OrderLineGetPayload<{ include: { product: true } }>;
type LineWithProductAndPR = Prisma.OrderLineGetPayload<{
  include: { product: true; purchaseRequest: true };
}>;

/**
 * Applies the effect of a single line becoming (or being re-)approved:
 * storage lines on inventory-tracked products deduct stock (negative stock
 * is allowed — it's a warning, never a block); supplier lines generate a
 * PurchaseRequest. Returns a stock warning if the deduction went negative.
 */
export async function applySideEffectForLine(
  tx: Tx,
  line: LineWithProduct
): Promise<StockWarning | null> {
  if (line.fulfillmentSource === "STORAGE") {
    if (line.product.trackInventory) {
      const updated = await tx.product.update({
        where: { id: line.productId },
        data: { currentStock: { decrement: line.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: line.productId,
          type: "SALE_DEDUCTION",
          quantity: line.quantity.negated(),
          note: `Order line ${line.id}`,
        },
      });
      await tx.orderLine.update({
        where: { id: line.id },
        data: { stockDeducted: true },
      });

      const resultingStock = updated.currentStock.toNumber();
      if (resultingStock < 0) {
        return { productId: line.productId, productName: line.product.name, resultingStock };
      }
    }
  } else if (line.fulfillmentSource === "SUPPLIER" && line.supplierId) {
    await tx.purchaseRequest.create({
      data: {
        orderLineId: line.id,
        supplierId: line.supplierId,
        productId: line.productId,
        quantity: line.quantity,
      },
    });
  }
  return null;
}

/**
 * Undoes applySideEffectForLine for a line that's being edited or removed
 * after approval: credits back any deducted stock (logged as an ADJUSTMENT,
 * distinct from the original SALE_DEDUCTION) and drops the purchase request.
 * No-ops for a line whose side effect was never applied (e.g. non-tracked
 * product, or a supplier line whose PR was already deleted).
 */
export async function reverseSideEffectForLine(tx: Tx, line: LineWithProductAndPR): Promise<void> {
  if (line.fulfillmentSource === "STORAGE" && line.stockDeducted) {
    if (line.product.trackInventory) {
      await tx.product.update({
        where: { id: line.productId },
        data: { currentStock: { increment: line.quantity } },
      });
      await tx.inventoryTransaction.create({
        data: {
          productId: line.productId,
          type: "ADJUSTMENT",
          quantity: line.quantity,
          note: `Reversed — order line ${line.id} edited after approval`,
        },
      });
    }
  } else if (line.fulfillmentSource === "SUPPLIER" && line.purchaseRequest) {
    await tx.purchaseRequest.delete({ where: { id: line.purchaseRequest.id } });
  }
}

/**
 * Runs the effects of an order becoming APPROVED:
 *  - storage lines on inventory-tracked products deduct stock (negative
 *    stock is allowed — it's a warning, never a block)
 *  - storage lines on non-tracked products are a no-op (nothing to deduct)
 *  - supplier lines each generate a PurchaseRequest
 */
export async function applyApprovalSideEffects(
  tx: Tx,
  orderId: string
): Promise<StockWarning[]> {
  const lines = await tx.orderLine.findMany({
    where: { orderId },
    include: { product: true },
  });

  const warnings: StockWarning[] = [];
  for (const line of lines) {
    const warning = await applySideEffectForLine(tx, line);
    if (warning) warnings.push(warning);
  }
  return warnings;
}
