"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { approveOrder, cancelOrder } from "@/lib/actions/orders";
import type { StockWarning } from "@/lib/order-engine";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

/**
 * Always mounted (regardless of canApprove/canCancel) so a flash message
 * from an action survives the router.refresh() that follows it — refresh
 * recomputes canApprove/canCancel from the server, and a component that's
 * only conditionally rendered on those flags would unmount (and lose its
 * local state) in the same pass that's supposed to show the result.
 */
export function OrderActionsPanel({
  orderId,
  canApprove,
  canCancel,
}: {
  orderId: string;
  canApprove: boolean;
  canCancel: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [approvalWarnings, setApprovalWarnings] = useState<StockWarning[] | null>(null);
  const [confirmingCancel, setConfirmingCancel] = useState(false);

  function handleApprove() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await approveOrder(orderId);
        setApprovalWarnings(res.warnings);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  function handleCancel() {
    setError(null);
    startTransition(async () => {
      try {
        await cancelOrder(orderId);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  const hasContent = canApprove || canCancel || approvalWarnings || error;
  if (!hasContent) return null;

  return (
    <div className="space-y-3">
      <div className="flex gap-3">
        {canApprove && (
          <Button onClick={handleApprove} disabled={isPending}>
            {isPending ? "Approving..." : "Approve order"}
          </Button>
        )}
        {canCancel && !confirmingCancel && (
          <Button variant="outline" onClick={() => setConfirmingCancel(true)} disabled={isPending}>
            Cancel order
          </Button>
        )}
        {canCancel && confirmingCancel && (
          <>
            <Button variant="destructive" onClick={handleCancel} disabled={isPending}>
              {isPending ? "Cancelling..." : "Confirm cancel"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmingCancel(false)} disabled={isPending}>
              Keep order
            </Button>
          </>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {approvalWarnings && approvalWarnings.length > 0 && (
        <Alert variant="warning">
          <AlertTitle>Stock went negative</AlertTitle>
          <AlertDescription>
            <ul className="list-disc space-y-0.5 pl-4">
              {approvalWarnings.map((w) => (
                <li key={w.productId}>
                  {w.productName}: {formatMoney(w.resultingStock)} remaining
                </li>
              ))}
            </ul>
            The order was approved anyway — inventory tracking never blocks fulfillment.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
