import { prisma } from "@/lib/prisma";
import type { ProductDTO } from "@/types/dto";

export async function getActiveProducts(): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    defaultSellingPrice: p.defaultSellingPrice.toNumber(),
    trackInventory: p.trackInventory,
    currentStock: p.currentStock.toNumber(),
  }));
}
