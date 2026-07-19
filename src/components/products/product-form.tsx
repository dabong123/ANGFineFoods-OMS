"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { ProductDTO } from "@/types/dto";
import { createProduct, updateProduct } from "@/lib/actions/products";

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
  product?: ProductDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(product?.name ?? "");
  const [pricePerKg, setPricePerKg] = useState(product ? String(product.defaultSellingPrice) : "");
  const [trackInventory, setTrackInventory] = useState(product?.trackInventory ?? false);
  const [currentStock, setCurrentStock] = useState(product ? String(product.currentStock) : "0");
  const [isActive, setIsActive] = useState(product?.isActive ?? true);

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    const price = Number(pricePerKg);
    if (!price || price <= 0) {
      setError("Enter a price greater than 0");
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      pricePerKg: price,
      trackInventory,
      currentStock: trackInventory ? Number(currentStock) || 0 : undefined,
      isActive,
    };

    startTransition(async () => {
      try {
        let productId: string;
        if (mode === "edit" && product) {
          await updateProduct(product.id, payload);
          productId = product.id;
        } else {
          const res = await createProduct(payload);
          productId = res.productId;
        }
        router.push(`/products/${productId}/edit`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
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
