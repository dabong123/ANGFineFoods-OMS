import { requirePermission } from "@/lib/auth-guard";
import { getArAgingSummary } from "@/lib/data/invoices";
import { formatMoney } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUCKET_LABELS: { key: keyof Awaited<ReturnType<typeof getArAgingSummary>>["buckets"]; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "1-30", label: "1–30 days" },
  { key: "31-60", label: "31–60 days" },
  { key: "61-90", label: "61–90 days" },
  { key: "90+", label: "90+ days" },
];

export default async function ReportsPage() {
  await requirePermission("reports:ar:view");
  const aging = await getArAgingSummary();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">AR Aging</h1>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Total Outstanding ({aging.invoiceCount} invoice{aging.invoiceCount === 1 ? "" : "s"})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-semibold">{formatMoney(aging.totalOutstanding)}</div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {BUCKET_LABELS.map(({ key, label }) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-semibold">{formatMoney(aging.buckets[key])}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
