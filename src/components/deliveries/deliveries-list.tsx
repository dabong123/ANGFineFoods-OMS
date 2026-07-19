import Link from "next/link";
import type { DeliveryDTO } from "@/types/dto";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function DeliveriesList({ deliveries }: { deliveries: DeliveryDTO[] }) {
  if (deliveries.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Deliveries</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {deliveries.map((d) => (
          <div
            key={d.id}
            className="flex flex-col gap-2 rounded-md border border-border p-3 text-sm sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <span className="font-medium">{d.deliveryNumber}</span>{" "}
              <span className="text-muted-foreground">
                &middot; {d.lineIds.length} line{d.lineIds.length === 1 ? "" : "s"}
                {d.deliveredAt && ` · ${new Date(d.deliveredAt).toLocaleDateString()}`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{d.status}</Badge>
              {d.invoiceId && (
                <Link href={`/invoices/${d.invoiceId}`} className="text-primary underline-offset-4 hover:underline">
                  {d.invoiceNumber}
                </Link>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
