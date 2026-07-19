"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { OrderLineDTO } from "@/types/dto";
import { createDelivery } from "@/lib/actions/deliveries";
import { formatMoney, formatQuantity } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CreateDeliveryPanel({
  orderId,
  undeliveredLines,
}: {
  orderId: string;
  undeliveredLines: OrderLineDTO[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(
    new Set(undeliveredLines.filter((l) => isReady(l)).map((l) => l.id))
  );
  const [error, setError] = useState<string | null>(null);

  function isReady(line: OrderLineDTO) {
    return line.fulfillmentSource === "STORAGE" || line.purchaseRequestStatus === "RECEIVED";
  }

  function toggle(lineId: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(lineId)) next.delete(lineId);
      else next.add(lineId);
      return next;
    });
  }

  const selectedTotal = useMemo(
    () =>
      undeliveredLines
        .filter((l) => selected.has(l.id))
        .reduce((sum, l) => sum + l.lineTotal, 0),
    [undeliveredLines, selected]
  );

  function handleCreate() {
    setError(null);
    startTransition(async () => {
      try {
        await createDelivery(orderId, Array.from(selected));
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (undeliveredLines.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Create delivery</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          {undeliveredLines.map((line) => {
            const ready = isReady(line);
            return (
              <label
                key={line.id}
                className={`flex items-center gap-3 rounded-md border border-border p-3 text-sm ${
                  ready ? "" : "opacity-50"
                }`}
              >
                <Checkbox
                  checked={selected.has(line.id)}
                  disabled={!ready}
                  onCheckedChange={() => toggle(line.id)}
                />
                <div className="flex-1">
                  <span className="font-medium">{line.productName}</span>{" "}
                  <span className="text-muted-foreground">
                    &middot; {formatQuantity(line.quantity)} {line.unit} &middot;{" "}
                    {formatMoney(line.lineTotal)}
                  </span>
                  {!ready && (
                    <p className="text-xs text-amber-600">
                      Waiting on {line.supplierName} — mark the purchase request received first
                    </p>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        <div className="flex items-center justify-between border-t border-border pt-3 text-sm">
          <span className="text-muted-foreground">
            {selected.size} line{selected.size === 1 ? "" : "s"} selected
          </span>
          <span className="font-medium">{formatMoney(selectedTotal)}</span>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Button onClick={handleCreate} disabled={isPending || selected.size === 0}>
          {isPending ? "Creating..." : "Create delivery & invoice"}
        </Button>
      </CardContent>
    </Card>
  );
}
