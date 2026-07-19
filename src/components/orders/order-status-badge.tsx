import type { OrderStatus } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const STATUS_STYLES: Record<OrderStatus, string> = {
  DRAFT: "bg-muted text-muted-foreground border-transparent",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 border-transparent dark:bg-amber-950 dark:text-amber-300",
  APPROVED: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300",
  REJECTED: "bg-red-100 text-red-800 border-transparent dark:bg-red-950 dark:text-red-300",
  CANCELLED: "bg-muted text-muted-foreground border-transparent line-through",
  DELIVERED: "bg-blue-100 text-blue-800 border-transparent dark:bg-blue-950 dark:text-blue-300",
  INVOICED: "bg-violet-100 text-violet-800 border-transparent dark:bg-violet-950 dark:text-violet-300",
  COMPLETED: "bg-emerald-100 text-emerald-800 border-transparent dark:bg-emerald-950 dark:text-emerald-300",
};

const STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  PENDING_APPROVAL: "Pending Approval",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
  DELIVERED: "Delivered",
  INVOICED: "Invoiced",
  COMPLETED: "Completed",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={cn("font-medium", STATUS_STYLES[status])}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
