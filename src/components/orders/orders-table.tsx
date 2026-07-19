"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  type ColumnDef,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";

import type { OrderListItemDTO } from "@/types/dto";
import { formatMoney } from "@/lib/format";
import { OrderStatusBadge } from "@/components/orders/order-status-badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

function sortableHeader(label: string) {
  return function Header({ column }: { column: { toggleSorting: (desc?: boolean) => void; getIsSorted: () => false | "asc" | "desc" } }) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="-ml-3 h-8"
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
      >
        {label}
        <ArrowUpDown className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    );
  };
}

const columns: ColumnDef<OrderListItemDTO>[] = [
  {
    accessorKey: "orderNumber",
    header: "Order #",
    cell: ({ row }) => <span className="font-medium">{row.original.orderNumber}</span>,
  },
  { accessorKey: "customerName", header: "Customer" },
  { accessorKey: "salesAgentName", header: "Sales Agent" },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => <OrderStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: "orderDate",
    header: sortableHeader("Date"),
    cell: ({ row }) => new Date(row.original.orderDate).toLocaleDateString(),
  },
  {
    accessorKey: "total",
    header: sortableHeader("Total"),
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.total)}</span>,
  },
];

export function OrdersTable({ orders }: { orders: OrderListItemDTO[] }) {
  const [sorting, setSorting] = useState<SortingState>([{ id: "orderDate", desc: true }]);
  const data = useMemo(() => orders, [orders]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No orders yet.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <TableHead key={header.id}>
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} className="cursor-pointer">
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="p-0">
                  <Link href={`/orders/${row.original.id}`} className="block px-3 py-3">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </Link>
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
