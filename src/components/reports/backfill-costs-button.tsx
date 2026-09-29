"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { backfillOrderLineCosts } from "@/lib/actions/products";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function BackfillCostsButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const res = await backfillOrderLineCosts();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setMessage(
        res.updatedCount > 0
          ? `Updated ${res.updatedCount} order line${res.updatedCount === 1 ? "" : "s"}.`
          : "Nothing to update — every priced product's lines already have a cost."
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isPending}>
        {isPending ? "Recalculating..." : "Recalculate costs from current product costs"}
      </Button>
      {message && <p className="text-xs text-muted-foreground">{message}</p>}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
