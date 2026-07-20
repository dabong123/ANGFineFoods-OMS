"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { OrderLineDTO } from "@/types/dto";
import { createDelivery } from "@/lib/actions/deliveries";
import { formatMoney, formatQuantity } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [actualWeights, setActualWeights] = useState<Record<string, string>>(
    Object.fromEntries(
      undeliveredLines.filter((l) => l.isWeightEstimated).map((l) => [l.id, String(l.quantity)])
    )
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

  function actualQuantityFor(line: OrderLineDTO): number {
    if (!line.isWeightEstimated) return line.quantity;
    const raw = actualWeights[line.id];
    return raw !== undefined && raw !== "" ? Number(raw) : line.quantity;
  }

  const selectedTotal = useMemo(
    () =>
      undeliveredLines
        .filter((l) => selected.has(l.id))
        .reduce((sum, l) => sum + actualQuantityFor(l) * l.unitPrice, 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [undeliveredLines, selected, actualWeights]
  );

  function handleCreate() {
    setError(null);
    for (const lineId of selected) {
      const line = undeliveredLines.find((l) => l.id === lineId);
      if (line?.isWeightEstimated && !(actualQuantityFor(line) > 0)) {
        setError(`Enter the actual weight for ${line.productName}`);
        return;
      }
    }

    const actualQuantities = Object.fromEntries(
      undeliveredLines
        .filter((l) => selected.has(l.id) && l.isWeightEstimated)
        .map((l) => [l.id, actualQuantityFor(l)])
    );

    startTransition(async () => {
      try {
        await createDelivery(orderId, Array.from(selected), actualQuantities);
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
              <div
                key={line.id}
                className={`rounded-md border border-border p-3 text-sm ${ready ? "" : "opacity-50"}`}
              >
                <label className="flex items-center gap-3">
                  <Checkbox
                    checked={selected.has(line.id)}
                    disabled={!ready}
                    onCheckedChange={() => toggle(line.id)}
                  />
                  <div className="flex-1">
                    <span className="font-medium">{line.productName}</span>{" "}
                    <span className="text-muted-foreground">
                      &middot; {formatQuantity(line.quantity)} {line.unit}
                      {line.isWeightEstimated ? " (estimated)" : ""} &middot;{" "}
                      {formatMoney(line.lineTotal)}
                    </span>
                    {!ready && (
                      <p className="text-xs text-amber-600">
                        Waiting on {line.supplierName} — mark the purchase request received first
                      </p>
                    )}
                  </div>
                </label>
                {line.isWeightEstimated && selected.has(line.id) && (
                  <div className="ml-7 mt-2 flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Actual weight (kg)</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      className="h-8 w-28"
                      value={actualWeights[line.id] ?? String(line.quantity)}
                      onChange={(e) =>
                        setActualWeights((prev) => ({ ...prev, [line.id]: e.target.value }))
                      }
                    />
                  </div>
                )}
              </div>
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
