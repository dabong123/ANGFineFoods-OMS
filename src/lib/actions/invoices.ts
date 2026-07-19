"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";

export async function recordPayment(input: {
  invoiceId: string;
  amount: number;
  method?: string;
  reference?: string;
  notes?: string;
}): Promise<void> {
  const session = await requireSession();
  if (!can(session.user.role, "payments:record")) {
    throw new Error("Not authorized to record payments");
  }
  if (input.amount <= 0) {
    throw new Error("Payment amount must be greater than 0");
  }

  const invoice = await prisma.invoice.findUnique({ where: { id: input.invoiceId } });
  if (!invoice) throw new Error("Invoice not found");
  if (invoice.status === "VOID") throw new Error("Cannot record a payment on a voided invoice");

  const balance = invoice.balance.toNumber();
  if (input.amount > balance) {
    throw new Error(`Amount exceeds the outstanding balance (${balance.toFixed(2)})`);
  }

  const newBalance = Math.round((balance - input.amount) * 100) / 100;
  const newAmountPaid = Math.round((invoice.amountPaid.toNumber() + input.amount) * 100) / 100;

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        invoiceId: invoice.id,
        amount: input.amount,
        method: input.method,
        reference: input.reference,
        notes: input.notes,
        recordedById: session.user.id,
      },
    });
    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        amountPaid: newAmountPaid,
        balance: newBalance,
        status: newBalance <= 0 ? "PAID" : "PARTIALLY_PAID",
      },
    });
  });

  revalidatePath("/invoices");
  revalidatePath(`/invoices/${invoice.id}`);
  revalidatePath("/reports");
}
