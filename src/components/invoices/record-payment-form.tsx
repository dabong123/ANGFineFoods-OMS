"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { recordPayment } from "@/lib/actions/invoices";
import { formatMoney } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function RecordPaymentForm({ invoiceId, balance }: { invoiceId: string; balance: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    setError(null);
    const parsedAmount = Number(amount);
    if (!parsedAmount || parsedAmount <= 0) {
      setError("Enter a payment amount greater than 0");
      return;
    }
    startTransition(async () => {
      try {
        await recordPayment({
          invoiceId,
          amount: parsedAmount,
          method: method || undefined,
          reference: reference || undefined,
        });
        setAmount("");
        setMethod("");
        setReference("");
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  if (balance <= 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Record payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              max={balance}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Balance: {formatMoney(balance)}</p>
          </div>
          <div className="space-y-2">
            <Label>Method (optional)</Label>
            <Input
              placeholder="Bank transfer, check..."
              value={method}
              onChange={(e) => setMethod(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Reference (optional)</Label>
            <Input
              placeholder="Check #, txn ID..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <Button onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Recording..." : "Record payment"}
        </Button>
      </CardContent>
    </Card>
  );
}
