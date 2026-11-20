"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { OrderLineDTO } from "@/types/dto";
import { correctDeliveredOrderLines } from "@/lib/actions/orders";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Draft = { quantity: string; unitPrice: string };

export function OrderCorrectionPanel({
  orderId,
  lines,
}: {
  orderId: string;
  lines: OrderLineDTO[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(
      lines.map((l) => [l.id, { quantity: String(l.quantity), unitPrice: String(l.unitPrice) }])
    )
  );

  if (lines.length === 0) return null;

  function updateDraft(lineId: string, field: keyof Draft, value: string) {
    setDrafts((prev) => ({ ...prev, [lineId]: { ...prev[lineId], [field]: value } }));
  }

  function handleSave() {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await correctDeliveredOrderLines({
        orderId,
        lines: lines.map((l) => ({
          lineId: l.id,
          quantity: Number(drafts[l.id].quantity),
          unitPrice: Number(drafts[l.id].unitPrice),
        })),
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSuccess(true);
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <div className="space-y-3">
        <Button variant="outline" onClick={() => setOpen(true)}>
          Correct a delivered line
        </Button>
        {success && (
          <Alert>
            <AlertDescription>
              Correction saved — the order total and linked invoice have been updated.
            </AlertDescription>
          </Alert>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Correct a delivered line</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant="warning">
          <AlertTitle>This order has already been delivered</AlertTitle>
          <AlertDescription>
            Changing quantity or price here will adjust stock on hand and update the linked invoice
            (and its balance) to match — even if that invoice is already marked paid.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {lines.map((line) => (
            <div key={line.id} className="grid grid-cols-1 gap-2 rounded-md border border-border p-3 sm:grid-cols-[1fr_auto_auto]">
              <div>
                <div className="font-medium">{line.productName}</div>
                <div className="text-xs text-muted-foreground">
                  {line.productSku} &middot; was {line.quantity} {line.unit} @ {formatMoney(line.unitPrice)}
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Quantity ({line.unit})</label>
                <Input
                  type="number"
                  step="0.001"
                  min="0"
                  value={drafts[line.id].quantity}
                  onChange={(e) => updateDraft(line.id, "quantity", e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">Unit price</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={drafts[line.id].unitPrice}
                  onChange={(e) => updateDraft(line.id, "unitPrice", e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
          ))}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex gap-3">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving..." : "Save correction"}
          </Button>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={isPending}>
            Cancel
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
