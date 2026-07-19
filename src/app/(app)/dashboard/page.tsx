import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO(milestone 4): wire these up to real aggregates.
const PLACEHOLDER_METRICS = [
  { label: "Open Orders", value: "—" },
  { label: "Revenue (MTD)", value: "—" },
  { label: "Outstanding AR", value: "—" },
  { label: "Overdue Invoices", value: "—" },
];

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLACEHOLDER_METRICS.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
