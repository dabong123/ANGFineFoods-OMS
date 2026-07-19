import Link from "next/link";
import { Plus } from "lucide-react";

import { requirePermission } from "@/lib/auth-guard";
import { getUsers } from "@/lib/data/users";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const ROLE_LABELS: Record<string, string> = {
  OWNER: "Owner",
  SALES_AGENT: "Sales Agent",
  ACCOUNTING: "Accounting",
};

export default async function UsersPage() {
  await requirePermission("users:manage");
  const users = await getUsers();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Users</h1>
        <Button asChild>
          <Link href="/users/new">
            <Plus className="mr-1.5 h-4 w-4" /> New user
          </Link>
        </Button>
      </div>

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="p-0">
                  <Link href={`/users/${u.id}/edit`} className="block px-3 py-3 font-medium">
                    {u.name}
                  </Link>
                </TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Badge variant="secondary">{ROLE_LABELS[u.role] ?? u.role}</Badge>
                </TableCell>
                <TableCell>
                  {u.isActive ? (
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
    </div>
  );
}
