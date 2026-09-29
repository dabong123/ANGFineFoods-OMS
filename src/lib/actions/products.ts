"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { productSchema, type ProductInput } from "@/lib/validations/product";
import { runAction, type ActionResult } from "@/lib/action-result";

async function requireManageProducts() {
  const session = await requireSession();
  if (!can(session.user.role, "products:manage")) {
    throw new Error("Not authorized to manage products");
  }
  return session;
}

async function generateSku(): Promise<string> {
  const prefix = "PROD-";
  const count = await prisma.product.count({ where: { sku: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

export async function createProduct(input: ProductInput): Promise<ActionResult<{ productId: string }>> {
  return runAction(async () => {
    await requireManageProducts();
    const parsed = productSchema.parse(input);

    const sku = await generateSku();
    const product = await prisma.product.create({
      data: {
        sku,
        name: parsed.name,
        unit: "kg",
        defaultSellingPrice: parsed.pricePerKg,
        defaultCostPrice: parsed.costPerKg ?? 0,
        trackInventory: parsed.trackInventory,
        currentStock: parsed.trackInventory ? parsed.currentStock ?? 0 : 0,
      },
    });

    revalidatePath("/products");
    return { productId: product.id };
  });
}

export async function updateProduct(productId: string, input: ProductInput): Promise<ActionResult> {
  return runAction(async () => {
    await requireManageProducts();
    const parsed = productSchema.parse(input);

    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing) throw new Error("Product not found");

    await prisma.product.update({
      where: { id: productId },
      data: {
        name: parsed.name,
        defaultSellingPrice: parsed.pricePerKg,
        defaultCostPrice: parsed.costPerKg ?? existing.defaultCostPrice,
        trackInventory: parsed.trackInventory,
        // Only overwrite stock if inventory tracking is (or was already) on —
        // never invent a stock figure for a product that never tracked one.
        currentStock: parsed.trackInventory
          ? parsed.currentStock ?? existing.currentStock
          : existing.currentStock,
        isActive: parsed.isActive,
      },
    });

    revalidatePath("/products");
    revalidatePath(`/products/${productId}`);
    return {};
  });
}

/**
 * One-time fixup for profit tracking: order lines written before a product's
 * cost was set (or before cost tracking existed at all) are stuck at 0 cost
 * forever, since cost is snapshotted at write time like price is. This finds
 * every such line and backfills it from its product's current cost — the
 * best estimate available since the real historical cost was never
 * recorded. Safe to run repeatedly: already-costed lines (costTotal > 0)
 * are left untouched, and lines whose product still has no cost set are
 * skipped rather than backfilled with 0 again.
 */
export async function backfillOrderLineCosts(): Promise<ActionResult<{ updatedCount: number }>> {
  return runAction(async () => {
    await requireManageProducts();

    const lines = await prisma.orderLine.findMany({
      where: { costTotal: 0 },
      select: { id: true, quantity: true, product: { select: { defaultCostPrice: true } } },
    });

    let updatedCount = 0;
    for (const line of lines) {
      const unitCost = line.product.defaultCostPrice.toNumber();
      if (unitCost <= 0) continue;
      const costTotal = Math.round(unitCost * line.quantity.toNumber() * 100) / 100;
      await prisma.orderLine.update({ where: { id: line.id }, data: { unitCost, costTotal } });
      updatedCount++;
    }

    revalidatePath("/dashboard");
    revalidatePath("/reports");
    return { updatedCount };
  });
}
