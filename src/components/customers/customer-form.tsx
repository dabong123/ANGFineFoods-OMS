"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { AssignableAgentDTO, CustomerDetailDTO } from "@/types/dto";
import { createCustomer, updateCustomer } from "@/lib/actions/customers";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Combobox, type ComboboxOption } from "@/components/ui/combobox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function CustomerForm({
  mode,
  customer,
  canAssignAgent,
  assignableAgents,
}: {
  mode: "create" | "edit";
  customer?: CustomerDetailDTO;
  canAssignAgent: boolean;
  assignableAgents: AssignableAgentDTO[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(customer?.name ?? "");
  const [contactName, setContactName] = useState(customer?.contactName ?? "");
  const [phone, setPhone] = useState(customer?.phone ?? "");
  const [email, setEmail] = useState(customer?.email ?? "");
  const [address, setAddress] = useState(customer?.address ?? "");
  const [salesAgentId, setSalesAgentId] = useState(customer?.salesAgentId ?? "");

  const agentOptions: ComboboxOption[] = useMemo(
    () =>
      assignableAgents.map((a) => ({
        value: a.id,
        label: a.name,
        description: a.role === "OWNER" ? "Owner" : "Sales Agent",
      })),
    [assignableAgents]
  );

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
      salesAgentId: salesAgentId || undefined,
    };

    startTransition(async () => {
      try {
        const res =
          mode === "edit" && customer
            ? await updateCustomer(customer.id, payload)
            : await createCustomer(payload);
        router.push(`/customers/${res.customerId}/edit`);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Customer details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Business name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Manila Grand Hotel" />
          </div>
          <div className="space-y-2">
            <Label>Contact person (optional)</Label>
            <Input value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Rosa Reyes" />
          </div>
          <div className="space-y-2">
            <Label>Phone (optional)</Label>
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0917-555-0101" />
          </div>
          <div className="space-y-2">
            <Label>Email (optional)</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contact@example.com"
            />
          </div>
          {canAssignAgent && (
            <div className="space-y-2">
              <Label>Sales agent</Label>
              <Combobox
                options={agentOptions}
                value={salesAgentId}
                onChange={setSalesAgentId}
                placeholder="Assign to..."
                searchPlaceholder="Search..."
              />
            </div>
          )}
          <div className="space-y-2 sm:col-span-2">
            <Label>Address (optional)</Label>
            <Textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Street, city, province"
              rows={2}
            />
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
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create customer"}
        </Button>
      </div>
    </div>
  );
}
