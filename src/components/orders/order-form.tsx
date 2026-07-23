"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";

import type { CustomerDTO, OrderDetailDTO, OrderLineDTO, ProductDTO, SupplierOptionDTO } from "@/types/dto";
import { createOrder, getCustomerPricesAction, updateOrder, updateApprovedOrder } from "@/lib/actions/orders";
import type { StockWarning } from "@/lib/order-engine";
import { formatMoney } from "@/lib/format";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

type LocalLine = {
  key: string;
  productId: string;
  quantity: string;
  isWeightEstimated: boolean;
  fulfillmentSource: "STORAGE" | "SUPPLIER";
  supplierId: string;
  unitPriceOverride: string;
};

// crypto.randomUUID() is only exposed in secure contexts (HTTPS or
// localhost) — testing over a plain http://<LAN-IP> origin from a phone
// leaves it undefined, so this key (just a React list key, not anything
// security-sensitive) is generated without it.
let lineKeyCounter = 0;
function generateLineKey(): string {
  lineKeyCounter += 1;
  return `new-line-${lineKeyCounter}`;
}

function newLine(): LocalLine {
  return {
    key: generateLineKey(),
    productId: "",
    quantity: "1",
    isWeightEstimated: false,
    fulfillmentSource: "STORAGE",
    supplierId: "",
    unitPriceOverride: "",
  };
}

function isLineLocked(l: OrderLineDTO): boolean {
  return l.deliveryId !== null || (l.fulfillmentSource === "SUPPLIER" && l.purchaseRequestStatus === "RECEIVED");
}

function linesFromOrder(order: OrderDetailDTO): LocalLine[] {
  return order.lines
    .filter((l) => !isLineLocked(l))
    .map((l) => ({
      key: l.id,
      productId: l.productId,
      quantity: String(l.quantity),
      isWeightEstimated: l.isWeightEstimated,
      fulfillmentSource: l.fulfillmentSource,
      supplierId: l.supplierId ?? "",
      unitPriceOverride: String(l.unitPrice),
    }));
}

export function OrderForm({
  mode,
  customers,
  products,
  suppliers,
  canOverridePricing,
  order,
}: {
  mode: "create" | "edit";
  customers: CustomerDTO[];
  products: ProductDTO[];
  suppliers: SupplierOptionDTO[];
  canOverridePricing: boolean;
  order?: OrderDetailDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [customerId, setCustomerId] = useState<string>(order?.customerId ?? "");
  const [notes, setNotes] = useState<string>(order?.notes ?? "");
  const [lines, setLines] = useState<LocalLine[]>(
    order ? linesFromOrder(order) : [newLine()]
  );
  const [customerPrices, setCustomerPrices] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ orderId: string; warnings: StockWarning[] } | null>(
    null
  );

  const isApprovedEdit =
    mode === "edit" && !!order && (order.status === "APPROVED" || order.status === "PARTIALLY_DELIVERED");
  const lockedLines = useMemo(() => (order ? order.lines.filter(isLineLocked) : []), [order]);
  const existingLineIds = useMemo(() => new Set(order?.lines.map((l) => l.id) ?? []), [order]);
  const lockedTotal = lockedLines.reduce((sum, l) => sum + l.lineTotal, 0);

  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const customerOptions: ComboboxOption[] = useMemo(
    () =>
      customers.map((c) => ({
        value: c.id,
        label: c.name,
        description: c.contactName ?? c.salesAgentName,
      })),
    [customers]
  );

  const productOptions: ComboboxOption[] = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: `${p.name} (${p.sku})`,
        description: `${formatMoney(p.defaultSellingPrice)} / ${p.unit}`,
      })),
    [products]
  );

  const supplierOptions: ComboboxOption[] = useMemo(
    () => suppliers.map((s) => ({ value: s.id, label: s.name })),
    [suppliers]
  );

  function priceForProduct(productId: string): number | null {
    if (!productId) return null;
    if (customerPrices[productId] !== undefined) return customerPrices[productId];
    return productById.get(productId)?.defaultSellingPrice ?? null;
  }

  function handleCustomerChange(id: string) {
    setCustomerId(id);
    setCustomerPrices({});
    startTransition(async () => {
      try {
        const prices = await getCustomerPricesAction(id);
        setCustomerPrices(prices);
      } catch {
        // Non-fatal: lines simply fall back to each product's default price.
      }
    });
  }

  function updateLine(key: string, patch: Partial<LocalLine>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  const rows = lines.map((line) => {
    const product = productById.get(line.productId);
    const computedPrice = priceForProduct(line.productId) ?? 0;
    const quantity = Number(line.quantity) || 0;
    const unitPrice =
      canOverridePricing && line.unitPriceOverride !== ""
        ? Number(line.unitPriceOverride)
        : computedPrice;
    const lineTotal = unitPrice * quantity;
    const negativeStockWarning =
      product?.trackInventory &&
      line.fulfillmentSource === "STORAGE" &&
      quantity > product.currentStock;

    return { line, product, computedPrice, quantity, unitPrice, lineTotal, negativeStockWarning };
  });

  const subtotal = rows.reduce((sum, r) => sum + r.lineTotal, 0);

  function validate(): string | null {
    if (!customerId) return "Select a customer";
    if (lines.length === 0 && lockedLines.length === 0) return "Add at least one line item";
    for (const row of rows) {
      if (!row.line.productId) return "Every line needs a product";
      if (row.quantity <= 0) return "Quantity must be greater than 0";
      if (row.line.fulfillmentSource === "SUPPLIER" && !row.line.supplierId) {
        return "Every supplier-fulfilled line needs a supplier";
      }
    }
    return null;
  }

  function handleSubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);

    const priceOverrideFor = (l: LocalLine) =>
      canOverridePricing && l.unitPriceOverride !== "" ? Number(l.unitPriceOverride) : undefined;

    startTransition(async () => {
      if (isApprovedEdit && order) {
        const res = await updateApprovedOrder({
          orderId: order.id,
          notes: notes || undefined,
          lines: lines.map((l) => ({
            lineId: existingLineIds.has(l.key) ? l.key : undefined,
            productId: l.productId,
            quantity: Number(l.quantity),
            fulfillmentSource: l.fulfillmentSource,
            supplierId: l.fulfillmentSource === "SUPPLIER" ? l.supplierId : undefined,
            unitPriceOverride: priceOverrideFor(l),
          })),
        });
        if (!res.ok) {
          setError(res.error);
          return;
        }
        setResult({ orderId: res.orderId, warnings: res.warnings });
        router.refresh();
        return;
      }

      const payload = {
        customerId,
        notes: notes || undefined,
        lines: lines.map((l) => ({
          productId: l.productId,
          quantity: Number(l.quantity),
          isWeightEstimated: l.isWeightEstimated,
          fulfillmentSource: l.fulfillmentSource,
          supplierId: l.fulfillmentSource === "SUPPLIER" ? l.supplierId : undefined,
          unitPriceOverride: priceOverrideFor(l),
        })),
      };
      const res =
        mode === "edit" && order
          ? await updateOrder({ orderId: order.id, ...payload })
          : await createOrder(payload);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setResult({ orderId: res.orderId, warnings: res.warnings });
      router.refresh();
    });
  }

  if (result) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {mode === "edit" ? "Order updated" : "Order created"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {result.warnings.length > 0 && (
            <Alert variant="warning">
              <AlertTitle>Stock went negative</AlertTitle>
              <AlertDescription>
                <ul className="list-disc space-y-0.5 pl-4">
                  {result.warnings.map((w) => (
                    <li key={w.productId}>
                      {w.productName}: {formatMoney(w.resultingStock)} remaining
                    </li>
                  ))}
                </ul>
                The order was created anyway — inventory tracking never blocks order entry.
              </AlertDescription>
            </Alert>
          )}
          <Button onClick={() => router.push(`/orders/${result.orderId}`)}>View order</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Customer</Label>
            <Combobox
              options={customerOptions}
              value={customerId}
              onChange={handleCustomerChange}
              placeholder="Select a customer"
              searchPlaceholder="Search customers..."
              disabled={mode === "edit"}
            />
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery instructions, special requests..."
              rows={1}
            />
          </div>
        </CardContent>
      </Card>

      {lockedLines.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Already shipped / received</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-xs text-muted-foreground">
              These lines are locked because they&apos;ve already been delivered or received from the
              supplier — editing them here would no longer match what actually went out or came in.
            </p>
            <Table className="min-w-[700px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Product</TableHead>
                  <TableHead className="w-[110px]">Qty</TableHead>
                  <TableHead className="w-[110px]">Unit price</TableHead>
                  <TableHead className="w-[130px]">Fulfillment</TableHead>
                  <TableHead className="w-[110px] text-right">Line total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lockedLines.map((l) => (
                  <TableRow key={l.id} className="text-muted-foreground">
                    <TableCell>{l.productName}</TableCell>
                    <TableCell>
                      {l.quantity} {l.unit}
                    </TableCell>
                    <TableCell>{formatMoney(l.unitPrice)}</TableCell>
                    <TableCell>{l.fulfillmentSource === "STORAGE" ? "Storage" : "Supplier"}</TableCell>
                    <TableCell className="text-right">{formatMoney(l.lineTotal)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Line items</CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={() => setLines((p) => [...p, newLine()])}>
            <Plus className="mr-1 h-4 w-4" /> Add line
          </Button>
        </CardHeader>
        <CardContent>
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[220px]">Product</TableHead>
                <TableHead className="w-[90px]">Qty</TableHead>
                <TableHead className="w-[110px]">Unit price</TableHead>
                <TableHead className="w-[130px]">Fulfillment</TableHead>
                <TableHead className="min-w-[180px]">Supplier</TableHead>
                <TableHead className="w-[110px] text-right">Line total</TableHead>
                <TableHead className="w-[40px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ line, product, computedPrice, lineTotal, negativeStockWarning }) => (
                <TableRow key={line.key}>
                  <TableCell>
                    <Combobox
                      options={productOptions}
                      value={line.productId}
                      onChange={(v) => updateLine(line.key, { productId: v })}
                      placeholder="Select product"
                      searchPlaceholder="Search products..."
                    />
                    {negativeStockWarning && product && (
                      <p className="mt-1 text-xs text-amber-600">
                        Only {product.currentStock} {product.unit} in stock — will go negative
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min="0"
                      step="0.001"
                      className="w-20"
                      value={line.quantity}
                      onChange={(e) => updateLine(line.key, { quantity: e.target.value })}
                    />
                    {!isApprovedEdit && (
                      <label className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Checkbox
                          checked={line.isWeightEstimated}
                          onCheckedChange={(checked) =>
                            updateLine(line.key, { isWeightEstimated: checked === true })
                          }
                        />
                        Est.
                      </label>
                    )}
                  </TableCell>
                  <TableCell>
                    {canOverridePricing ? (
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="w-24"
                        placeholder={computedPrice ? formatMoney(computedPrice) : "0.00"}
                        value={line.unitPriceOverride}
                        onChange={(e) =>
                          updateLine(line.key, { unitPriceOverride: e.target.value })
                        }
                      />
                    ) : (
                      <span className="text-sm">{formatMoney(computedPrice)}</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      value={line.fulfillmentSource}
                      onValueChange={(v) =>
                        updateLine(line.key, {
                          fulfillmentSource: v as "STORAGE" | "SUPPLIER",
                          supplierId: v === "STORAGE" ? "" : line.supplierId,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="STORAGE">Storage</SelectItem>
                        <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    {line.fulfillmentSource === "SUPPLIER" ? (
                      <Combobox
                        options={supplierOptions}
                        value={line.supplierId}
                        onChange={(v) => updateLine(line.key, { supplierId: v })}
                        placeholder="Select supplier"
                        searchPlaceholder="Search suppliers..."
                      />
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right text-sm font-medium">
                    {formatMoney(lineTotal)}
                  </TableCell>
                  <TableCell>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLine(line.key)}
                      disabled={lines.length === 1 && lockedLines.length === 0}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          <div className="mt-4 flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              {lockedLines.length > 0 && (
                <>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Already shipped</span>
                    <span>{formatMoney(lockedTotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>Editable lines</span>
                    <span>{formatMoney(subtotal)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between font-medium">
                <span>Total</span>
                <span>{formatMoney(subtotal + lockedTotal)}</span>
              </div>
            </div>
          </div>
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
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create order"}
        </Button>
      </div>
    </div>
  );
}
