import Link from "next/link";
import { Plus } from "lucide-react";

import { requireAnyPermission } from "@/lib/auth-guard";
import { can } from "@/types";
import { getCustomerListForSession } from "@/lib/data/customers";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function CustomersPage() {
  const session = await requireAnyPermission(["customers:view:own", "customers:view:all"]);
  const customers = await getCustomerListForSession(session);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
        {can(session.user.role, "customers:create") && (
          <Button asChild>
            <Link href="/customers/new">
              <Plus className="mr-1.5 h-4 w-4" /> New customer
            </Link>
          </Button>
        )}
      </div>

      {customers.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No customers yet.
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
                <TableHead>Sales Agent</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="p-0">
                    <Link href={`/customers/${c.id}/edit`} className="block px-3 py-3 font-medium">
                      {c.name}
                    </Link>
                  </TableCell>
                  <TableCell>{c.contactName ?? "—"}</TableCell>
                  <TableCell>{c.phone ?? "—"}</TableCell>
                  <TableCell>{c.email ?? "—"}</TableCell>
                  <TableCell>{c.salesAgentName}</TableCell>
                  <TableCell>
                    {c.isActive ? (
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
