"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Role } from "@prisma/client";

import type { UserDetailDTO } from "@/types/dto";
import { createUser, updateUser } from "@/lib/actions/users";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  SALES_AGENT: "Sales Agent",
  ACCOUNTING: "Accounting",
};

export function UserForm({
  mode,
  user,
  isSelf,
}: {
  mode: "create" | "edit";
  user?: UserDetailDTO;
  isSelf?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [role, setRole] = useState<Role>(user?.role ?? "SALES_AGENT");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
  const [password, setPassword] = useState("");

  function handleSubmit() {
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required");
      return;
    }
    if (mode === "create" && password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        if (mode === "edit" && user) {
          await updateUser(user.id, {
            name: name.trim(),
            email: email.trim(),
            role,
            isActive,
            password,
          });
        } else {
          await createUser({ name: name.trim(), email: email.trim(), role, password });
        }
        router.push("/users");
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
          <CardTitle className="text-base">User details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Dela Cruz" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@angfinefoods.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)} disabled={isSelf}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(ROLE_LABELS) as Role[]).map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isSelf && (
              <p className="text-xs text-muted-foreground">
                You can&apos;t change your own role.
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{mode === "edit" ? "Reset password (optional)" : "Password"}</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "edit" ? "Leave blank to keep current password" : "At least 8 characters"}
              autoComplete="new-password"
            />
          </div>
          {mode === "edit" && (
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={isActive}
                disabled={isSelf}
                onCheckedChange={(checked) => setIsActive(checked === true)}
              />
              Active (unchecking blocks this user from signing in)
              {isSelf && (
                <span className="text-xs text-muted-foreground">— can&apos;t deactivate yourself</span>
              )}
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
          {isPending ? "Saving..." : mode === "edit" ? "Save changes" : "Create user"}
        </Button>
      </div>
    </div>
  );
}
