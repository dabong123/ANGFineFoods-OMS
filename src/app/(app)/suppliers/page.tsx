import Link from "next/link";
import { Plus } from "lucide-react";

import { requirePermission } from "@/lib/auth-guard";
import { getAllSuppliers } from "@/lib/data/suppliers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function SuppliersPage() {
  await requirePermission("suppliers:manage");
  const suppliers = await getAllSuppliers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
        <Button asChild>
          <Link href="/suppliers/new">
            <Plus className="mr-1.5 h-4 w-4" /> New supplier
          </Link>
        </Button>
      </div>

      {suppliers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No suppliers yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="p-0">
                    <Link href={`/suppliers/${s.id}/edit`} className="block px-3 py-3 font-medium">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.contactName || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{s.email || "—"}</TableCell>
                  <TableCell>
                    {s.isActive ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-muted-foreground">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
