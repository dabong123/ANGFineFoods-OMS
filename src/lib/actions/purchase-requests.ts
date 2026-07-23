"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { runAction, type ActionResult } from "@/lib/action-result";

async function requireManagePurchaseRequests() {
  const session = await requireSession();
  if (!can(session.user.role, "purchaseRequests:manage")) {
    throw new Error("Not authorized to manage purchase requests");
  }
  return session;
}

export async function markPurchaseRequestOrdered(purchaseRequestId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManagePurchaseRequests();

    const pr = await prisma.purchaseRequest.findUnique({ where: { id: purchaseRequestId } });
    if (!pr) throw new Error("Purchase request not found");
    if (pr.status !== "PENDING") throw new Error("Only pending purchase requests can be marked ordered");

    await prisma.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: { status: "ORDERED" },
    });

    revalidatePath("/purchase-requests");
    return {};
  });
}

export async function markPurchaseRequestReceived(purchaseRequestId: string): Promise<ActionResult> {
  return runAction(async () => {
    await requireManagePurchaseRequests();

    const pr = await prisma.purchaseRequest.findUnique({ where: { id: purchaseRequestId } });
    if (!pr) throw new Error("Purchase request not found");
    if (pr.status !== "PENDING" && pr.status !== "ORDERED") {
      throw new Error("Only pending or ordered purchase requests can be marked received");
    }

    await prisma.purchaseRequest.update({
      where: { id: purchaseRequestId },
      data: { status: "RECEIVED", receivedAt: new Date() },
    });

    revalidatePath("/purchase-requests");
    revalidatePath("/orders");
    return {};
  });
}
