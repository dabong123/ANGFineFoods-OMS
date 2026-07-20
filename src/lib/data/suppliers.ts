import { prisma } from "@/lib/prisma";
import type { SupplierDTO } from "@/types/dto";

function toSupplierDTO(s: {
  id: string;
  name: string;
  contactName: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  isActive: boolean;
}): SupplierDTO {
  return {
    id: s.id,
    name: s.name,
    contactName: s.contactName,
    phone: s.phone,
    email: s.email,
    address: s.address,
    isActive: s.isActive,
  };
}

/** For pickers (order form) — active suppliers only. */
export async function getActiveSuppliers(): Promise<{ id: string; name: string }[]> {
  return prisma.supplier.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });
}

/** For the admin supplier list — includes inactive suppliers. */
export async function getAllSuppliers(): Promise<SupplierDTO[]> {
  const suppliers = await prisma.supplier.findMany({ orderBy: { name: "asc" } });
  return suppliers.map(toSupplierDTO);
}

export async function getSupplierDetail(supplierId: string): Promise<SupplierDTO | null> {
  const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
  return supplier ? toSupplierDTO(supplier) : null;
}
