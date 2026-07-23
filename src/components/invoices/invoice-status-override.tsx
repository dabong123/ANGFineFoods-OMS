"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { InvoiceStatus } from "@prisma/client";

import { setInvoiceStatus } from "@/lib/actions/invoices";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function InvoiceStatusOverride({ invoiceId, status }: { invoiceId: string; status: InvoiceStatus }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (status === "VOID") return null;

  function handleSetStatus(next: "PAID" | "UNPAID") {
    setError(null);
    startTransition(async () => {
      const res = await setInvoiceStatus(invoiceId, next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status !== "PAID" && (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleSetStatus("PAID")}>
          Mark as paid
        </Button>
      )}
      {status !== "UNPAID" && (
        <Button variant="outline" size="sm" disabled={isPending} onClick={() => handleSetStatus("UNPAID")}>
          Mark as unpaid
        </Button>
      )}
      {error && (
        <Alert variant="destructive" className="w-full">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
