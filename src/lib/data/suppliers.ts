import { prisma } from "@/lib/prisma";
import type { SupplierDTO } from "@/types/dto";

export async function getActiveSuppliers(): Promise<SupplierDTO[]> {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  return suppliers.map((s) => ({ id: s.id, name: s.name }));
}
