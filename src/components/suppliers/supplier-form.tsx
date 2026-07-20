"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { SupplierDTO } from "@/types/dto";
import { createSupplier, updateSupplier } from "@/lib/actions/suppliers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function SupplierForm({
  mode,
  supplier,
}: {
  mode: "create" | "edit";
  supplier?: SupplierDTO;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(supplier?.name ?? "");
  const [contactName, setContactName] = useState(supplier?.contactName ?? "");
  const [phone, setPhone] = useState(supplier?.phone ?? "");
  const [email, setEmail] = useState(supplier?.email ?? "");
  const [address, setAddress] = useState(supplier?.address ?? "");
  const [isActive, setIsActive] = useState(supplier?.isActive ?? true);

  function handleSubmit() {
    if (!name.trim()) {
      setError("Name is required");
      return;
    }
    setError(null);

    const payload = {
      name: name.trim(),
      contactName: contactName.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      isActive,
    };

    startTransition(async () => {
      try {
        let supplierId: string;
        if (mode === "edit" && supplier) {
          await updateSupplier(supplier.id, payload);
          supplierId = supplier.id;
        } else {
          const res = await createSupplier(payload);
          supplierId = res.supplierId;
        }
        router.push(`/suppliers/${supplierId}/edit`);
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
          <CardTitle className="text-base">Supplier details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Supplier name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Manila Cold Storage Inc." />
          </div>

          <div className="space-y-2">
            <Label>Contact person</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Juan Dela Cruz" />
          </div>

          <div className="space-y-2">
            <Label>Contact number</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+63 917 000 0000" />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="orders@supplier.com"
            />
          </div>

          <div className="space-y-2">
            <Label>Address</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Warehouse address" />
          </div>

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
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create supplier"}
        </Button>
      </div>
    </div>
  );
}
