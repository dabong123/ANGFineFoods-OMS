import { Prisma } from "@prisma/client";
import type { AgingBucket } from "@/types/dto";

type Tx = Prisma.TransactionClient;

/** Net payment terms applied to every invoice — not yet customer-configurable. */
export const DEFAULT_PAYMENT_TERMS_DAYS = 30;

export async function generateDeliveryNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `DEL-${year}-`;
  const count = await tx.delivery.count({ where: { deliveryNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

export async function generateInvoiceNumber(tx: Tx): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}-`;
  const count = await tx.invoice.count({ where: { invoiceNumber: { startsWith: prefix } } });
  return `${prefix}${String(count + 1).padStart(5, "0")}`;
}

export function computeAgingBucket(dueDate: Date, now: Date = new Date()): AgingBucket {
  const daysPastDue = Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysPastDue <= 0) return "current";
  if (daysPastDue <= 30) return "1-30";
  if (daysPastDue <= 60) return "31-60";
  if (daysPastDue <= 90) return "61-90";
  return "90+";
}

export function isOverdue(dueDate: Date, balance: number, now: Date = new Date()): boolean {
  return balance > 0 && dueDate.getTime() < now.getTime();
}
