import { requireSession } from "@/lib/auth-guard";
import { getDashboardMetrics } from "@/lib/data/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function DashboardPage() {
  const session = await requireSession();
  const metrics = await getDashboardMetrics(session);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-semibold">{metric.value}</div>
              {metric.sublabel && (
                <p className="mt-1 text-xs text-muted-foreground">{metric.sublabel}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
