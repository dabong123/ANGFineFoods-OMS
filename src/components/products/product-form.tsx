"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ProductDetailDTO } from "@/types/dto";
import { createProduct, updateProduct } from "@/lib/actions/products";
import { formatMoney } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ProductForm({
  mode,
  product,
}: {
  mode: "create" | "edit";
  product?: ProductDetailDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [pricePerKg, setPricePerKg] = useState(product ? String(product.defaultSellingPrice) : "");
  const [costPerKg, setCostPerKg] = useState(product ? String(product.defaultCostPrice) : "");
  const [trackInventory, setTrackInventory] = useState(product?.trackInventory ?? false);
  const [currentStock, setCurrentStock] = useState(product ? String(product.currentStock) : "0");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  const price = Number(pricePerKg) || 0;
  const cost = Number(costPerKg) || 0;
  const margin = price - cost;
  const marginPct = price > 0 ? (margin / price) * 100 : 0;

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    if (!price || price <= 0) {
      setError("Enter a price greater than 0");
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      pricePerKg: price,
      costPerKg: costPerKg === "" ? undefined : cost,
      trackInventory,
      currentStock: trackInventory ? Number(currentStock) || 0 : undefined,
      isActive,
    };

    startTransition(async () => {
      let productId: string;
      if (mode === "edit" && product) {
        const res = await updateProduct(product.id, payload);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        productId = product.id;
      } else {
        const res = await createProduct(payload);
        if (!res.ok) {
          setError(res.error);
          return;
        }
        productId = res.productId;
      }
      router.push(`/products/${productId}/edit`);
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Product details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {mode === "edit" && product && (
            <div className="space-y-1">
              <Label className="text-muted-foreground">SKU</Label>
              <p className="text-sm">{product.sku}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Product name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Beef Brisket" />
          </div>

          <div className="space-y-2">
            <Label>Price per kg</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={pricePerKg}
                onChange={(e) => setPricePerKg(e.target.value)}
                placeholder="0.00"
                className="max-w-[160px]"
              />
              <span className="text-sm text-muted-foreground">per kg</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Cost per kg</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                step="0.01"
                value={costPerKg}
                onChange={(e) => setCostPerKg(e.target.value)}
                placeholder="0.00"
                className="max-w-[160px]"
              />
              <span className="text-sm text-muted-foreground">per kg</span>
            </div>
            <p className="text-xs text-muted-foreground">
              What you pay for it — used to calculate profit. Leave blank until you know it; profit
              will show as 0 for this product until it&apos;s set.
            </p>
            {price > 0 && cost > 0 && (
              <p className="text-xs">
                Margin: <span className="font-medium">{formatMoney(margin)}</span> per kg (
                {marginPct.toFixed(1)}%)
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={trackInventory}
              onCheckedChange={(checked) => setTrackInventory(checked === true)}
            />
            Track inventory for this product
          </label>

          {trackInventory && (
            <div className="space-y-2">
              <Label>Current stock (kg)</Label>
              <Input
                type="number"
                min="0"
                step="0.001"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="max-w-[160px]"
              />
              <p className="text-xs text-muted-foreground">
                Stock deducts automatically as storage-fulfilled orders are approved.
              </p>
            </div>
          )}

          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={isActive} onCheckedChange={(checked) => setIsActive(checked === true)} />
              Active (uncheck to hide from new orders without deleting history)
            </label>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSubmit} disabled={isPending}>
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create product"}
        </Button>
      </div>
    </div>
  );
}
