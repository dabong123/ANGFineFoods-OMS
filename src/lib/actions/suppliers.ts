"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { supplierSchema, type SupplierInput } from "@/lib/validations/supplier";
import { runAction, type ActionResult } from "@/lib/action-result";

async function requireManageSuppliers() {
  const session = await requireSession();
  if (!can(session.user.role, "suppliers:manage")) {
    throw new Error("Not authorized to manage suppliers");
  }
  return session;
}

export async function createSupplier(input: SupplierInput): Promise<ActionResult<{ supplierId: string }>> {
  return runAction(async () => {
    await requireManageSuppliers();
    const parsed = supplierSchema.parse(input);

    const supplier = await prisma.supplier.create({
      data: {
        name: parsed.name,
        contactName: parsed.contactName || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
      },
    });

    revalidatePath("/suppliers");
    return { supplierId: supplier.id };
  });
}

export async function updateSupplier(supplierId: string, input: SupplierInput): Promise<ActionResult> {
  return runAction(async () => {
    await requireManageSuppliers();
    const parsed = supplierSchema.parse(input);

    const existing = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!existing) throw new Error("Supplier not found");

    await prisma.supplier.update({
      where: { id: supplierId },
      data: {
        name: parsed.name,
        contactName: parsed.contactName || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        isActive: parsed.isActive,
      },
    });

    revalidatePath("/suppliers");
    revalidatePath(`/suppliers/${supplierId}`);
    return {};
  });
}
