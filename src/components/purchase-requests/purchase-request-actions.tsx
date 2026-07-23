"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { PurchaseRequestStatus } from "@prisma/client";

import { markPurchaseRequestOrdered, markPurchaseRequestReceived } from "@/lib/actions/purchase-requests";
import type { ActionResult } from "@/lib/action-result";
import { Button } from "@/components/ui/button";

export function PurchaseRequestActions({
  id,
  status,
}: {
  id: string;
  status: PurchaseRequestStatus;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>) {
    setError(null);
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  if (status === "RECEIVED" || status === "CANCELLED") {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      {status === "PENDING" && (
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => run(() => markPurchaseRequestOrdered(id))}
        >
          Mark ordered
        </Button>
      )}
      <Button
        size="sm"
        disabled={isPending}
        onClick={() => run(() => markPurchaseRequestReceived(id))}
      >
        Mark received
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
