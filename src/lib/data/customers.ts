import { prisma } from "@/lib/prisma";
import type { CustomerDTO } from "@/types/dto";
import type { Session } from "next-auth";

/** Sales agents only see their own customers; everyone else sees all. */
export async function getCustomersForSession(session: Session): Promise<CustomerDTO[]> {
  const customers = await prisma.customer.findMany({
    where: {
      isActive: true,
      ...(session.user.role === "SALES_AGENT"
        ? { salesAgentId: session.user.id }
        : {}),
    },
    include: { salesAgent: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    contactName: c.contactName,
    salesAgentId: c.salesAgentId,
    salesAgentName: c.salesAgent.name,
  }));
}

export async function getCustomerPricesForCustomer(
  customerId: string
): Promise<Record<string, number>> {
  const rows = await prisma.customerProductPrice.findMany({
    where: { customerId },
    select: { productId: true, price: true },
  });
  return Object.fromEntries(rows.map((r) => [r.productId, r.price.toNumber()]));
}
