import Link from "next/link";
import { Plus } from "lucide-react";

import { requirePermission } from "@/lib/auth-guard";
import { getAllProducts } from "@/lib/data/products";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default async function ProductsPage() {
  await requirePermission("products:manage");
  const products = await getAllProducts();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
        <Button asChild>
          <Link href="/products/new">
            <Plus className="mr-1.5 h-4 w-4" /> New product
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No products yet.
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Name</TableHead>
                <TableHead className="text-right">Price / kg</TableHead>
                <TableHead>Inventory</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="text-muted-foreground">{p.sku}</TableCell>
                  <TableCell className="p-0">
                    <Link href={`/products/${p.id}/edit`} className="block px-3 py-3 font-medium">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(p.defaultSellingPrice)}</TableCell>
                  <TableCell>
                    {p.trackInventory ? (
                      <span>{p.currentStock} kg</span>
                    ) : (
                      <span className="text-muted-foreground">Not tracked</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {p.isActive ? (
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
