import { prisma } from "@/lib/prisma";
import type {
  AssignableAgentDTO,
  CustomerDetailDTO,
  CustomerDTO,
  CustomerListItemDTO,
} from "@/types/dto";
import type { Session } from "next-auth";

function scopeForSession(session: Session) {
  return session.user.role === "SALES_AGENT"
    ? { salesAgentId: session.user.id }
    : {};
}

/** Sales agents only see their own customers; everyone else sees all. */
export async function getCustomersForSession(session: Session): Promise<CustomerDTO[]> {
  const customers = await prisma.customer.findMany({
    where: { isActive: true, ...scopeForSession(session) },
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

export async function getCustomerListForSession(
  session: Session
): Promise<CustomerListItemDTO[]> {
  const customers = await prisma.customer.findMany({
    where: scopeForSession(session),
    include: { salesAgent: { select: { name: true } } },
    orderBy: { name: "asc" },
  });

  return customers.map((c) => ({
    id: c.id,
    name: c.name,
    contactName: c.contactName,
    phone: c.phone,
    email: c.email,
    salesAgentName: c.salesAgent.name,
    isActive: c.isActive,
  }));
}

export async function getCustomerDetailForSession(
  session: Session,
  customerId: string
): Promise<CustomerDetailDTO | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: { salesAgent: { select: { name: true } } },
  });
  if (!customer) return null;
  if (session.user.role === "SALES_AGENT" && customer.salesAgentId !== session.user.id) {
    return null;
  }

  return {
    id: customer.id,
    name: customer.name,
    contactName: customer.contactName,
    phone: customer.phone,
    email: customer.email,
    address: customer.address,
    salesAgentId: customer.salesAgentId,
    salesAgentName: customer.salesAgent.name,
    isActive: customer.isActive,
  };
}

/** Owner/sales-agent users a customer can be assigned to — accounting doesn't own customers. */
export async function getAssignableAgents(): Promise<AssignableAgentDTO[]> {
  const users = await prisma.user.findMany({
    where: { role: { in: ["OWNER", "SALES_AGENT"] }, isActive: true },
    orderBy: { name: "asc" },
  });
  return users.map((u) => ({ id: u.id, name: u.name, role: u.role as "OWNER" | "SALES_AGENT" }));
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
