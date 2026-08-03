import { requireAnyPermission } from "@/lib/auth-guard";
import { can } from "@/types";
import { getArAgingSummary } from "@/lib/data/invoices";
import { getSalesReportForMonth } from "@/lib/data/reports";
import { formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const BUCKET_LABELS: { key: keyof Awaited<ReturnType<typeof getArAgingSummary>>["buckets"]; label: string }[] = [
  { key: "current", label: "Current" },
  { key: "1-30", label: "1–30 days" },
  { key: "31-60", label: "31–60 days" },
  { key: "61-90", label: "61–90 days" },
  { key: "90+", label: "90+ days" },
];

function parseMonthParam(raw: string | undefined): { year: number; month: number } {
  const now = new Date();
  const match = raw?.match(/^(\d{4})-(\d{2})$/);
  if (match) {
    return { year: Number(match[1]), month: Number(match[2]) };
  }
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const session = await requireAnyPermission(["reports:ar:view", "reports:sales:view"]);
  const canViewSales = can(session.user.role, "reports:sales:view");
  const canViewAr = can(session.user.role, "reports:ar:view");

  const { year, month } = parseMonthParam(searchParams.month);
  const monthValue = `${year}-${String(month).padStart(2, "0")}`;

  const [sales, aging] = await Promise.all([
    canViewSales ? getSalesReportForMonth(year, month) : null,
    canViewAr ? getArAgingSummary() : null,
  ]);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>

      {sales && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium">Sales</h2>
            <form className="flex items-end gap-2">
              <div className="space-y-1">
                <Label htmlFor="month" className="text-xs text-muted-foreground">
                  Month
                </Label>
                <Input id="month" type="month" name="month" defaultValue={monthValue} className="w-40" />
              </div>
              <Button type="submit" variant="outline" size="sm">
                View
              </Button>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatMoney(sales.totalRevenue)}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Invoices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{sales.invoiceCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Orders</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{sales.orderCount}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Avg. invoice</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-semibold">{formatMoney(sales.averageInvoiceValue)}</div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {aging && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">AR Aging</h2>

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
      )}
    </div>
  );
}
