"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";

import { setInvoiceStatus } from "@/lib/actions/invoices";
import { InvoiceStatusBadge } from "@/components/invoices/invoice-status-badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  UNPAID: "Unpaid",
  PARTIALLY_PAID: "Partially Paid",
  PAID: "Paid",
  VOID: "Void",
};

export function InvoiceStatusSelect({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (status === "VOID") return <InvoiceStatusBadge status={status} />;

  function handleChange(value: string) {
    if (value !== "PAID" && value !== "UNPAID") return;
    startTransition(async () => {
      const res = await setInvoiceStatus(invoiceId, value);
      if (!res.ok) {
        window.alert(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <Select
      value={status === "UNPAID" || status === "PAID" ? status : undefined}
      onValueChange={handleChange}
      disabled={isPending}
    >
      <SelectTrigger className="h-8 w-[130px]">
        <SelectValue placeholder={STATUS_LABELS[status]} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="UNPAID">Unpaid</SelectItem>
        <SelectItem value="PAID">Paid</SelectItem>
      </SelectContent>
    </Select>
  );
}
