import { prisma } from "@/lib/prisma";
import type { ProductDTO, ProductDetailDTO } from "@/types/dto";

function toProductDTO(p: {
  id: string;
  sku: string;
  name: string;
  unit: string;
  defaultSellingPrice: { toNumber(): number };
  trackInventory: boolean;
  currentStock: { toNumber(): number };
  isActive: boolean;
}): ProductDTO {
  return {
    id: p.id,
    sku: p.sku,
    name: p.name,
    unit: p.unit,
    defaultSellingPrice: p.defaultSellingPrice.toNumber(),
    trackInventory: p.trackInventory,
    currentStock: p.currentStock.toNumber(),
    isActive: p.isActive,
  };
}

/** For pickers (order form) — active products only. */
export async function getActiveProducts(): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return products.map(toProductDTO);
}

/** For the admin product list — includes inactive/discontinued products. */
export async function getAllProducts(): Promise<ProductDTO[]> {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return products.map(toProductDTO);
}

export async function getProductDetail(productId: string): Promise<ProductDetailDTO | null> {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return null;
  return { ...toProductDTO(product), defaultCostPrice: product.defaultCostPrice.toNumber() };
}
