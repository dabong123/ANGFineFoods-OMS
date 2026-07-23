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
