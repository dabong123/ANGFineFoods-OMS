"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { runAction, type ActionResult } from "@/lib/action-result";

async function resolveSalesAgentId(
  input: CustomerInput,
  actorRole: string,
  actorId: string
): Promise<string> {
  if (actorRole === "SALES_AGENT") {
    return actorId;
  }

  // OWNER (the only other role with customers:create) may assign any
  // owner/sales-agent user; default to themselves if none was picked.
  const targetId = input.salesAgentId || actorId;
  const target = await prisma.user.findUnique({ where: { id: targetId } });
  if (!target || (target.role !== "OWNER" && target.role !== "SALES_AGENT")) {
    throw new Error("Invalid sales agent");
  }
  return target.id;
}

export async function createCustomer(input: CustomerInput): Promise<ActionResult<{ customerId: string }>> {
  return runAction(async () => {
    const session = await requireSession();
    if (!can(session.user.role, "customers:create")) {
      throw new Error("Not authorized to create customers");
    }

    const parsed = customerSchema.parse(input);
    const salesAgentId = await resolveSalesAgentId(parsed, session.user.role, session.user.id);

    const customer = await prisma.customer.create({
      data: {
        name: parsed.name,
        contactName: parsed.contactName || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        salesAgentId,
      },
    });

    revalidatePath("/customers");
    return { customerId: customer.id };
  });
}

export async function updateCustomer(
  customerId: string,
  input: CustomerInput
): Promise<ActionResult<{ customerId: string }>> {
  return runAction(async () => {
    const session = await requireSession();

    const existing = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!existing) throw new Error("Customer not found");

    const isOwnCustomer = existing.salesAgentId === session.user.id;
    const allowed =
      (isOwnCustomer && can(session.user.role, "customers:edit:own")) ||
      can(session.user.role, "customers:edit:all");
    if (!allowed) throw new Error("Not authorized to edit this customer");

    const parsed = customerSchema.parse(input);
    const salesAgentId =
      session.user.role === "SALES_AGENT"
        ? existing.salesAgentId
        : await resolveSalesAgentId(parsed, session.user.role, session.user.id);

    await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: parsed.name,
        contactName: parsed.contactName || null,
        phone: parsed.phone || null,
        email: parsed.email || null,
        address: parsed.address || null,
        salesAgentId,
      },
    });

    revalidatePath("/customers");
    revalidatePath(`/customers/${customerId}`);
    return { customerId };
  });
}
