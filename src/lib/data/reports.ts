import { prisma } from "@/lib/prisma";
import type { ProfitReportDTO, SalesReportDTO } from "@/types/dto";

function monthRange(year: number, month: number): { monthStart: Date; monthEnd: Date } {
  return { monthStart: new Date(year, month - 1, 1), monthEnd: new Date(year, month, 1) };
}

/** Revenue/orders for a single calendar month — lets past months stay
 * visible under Reports instead of only ever showing "this month" like
 * the Dashboard's Revenue (MTD) tile does. */
export async function getSalesReportForMonth(year: number, month: number): Promise<SalesReportDTO> {
  const { monthStart, monthEnd } = monthRange(year, month);

  const [invoiceAgg, orderCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { issueDate: { gte: monthStart, lt: monthEnd } },
      _sum: { total: true },
      _count: true,
    }),
    prisma.order.count({
      where: {
        createdAt: { gte: monthStart, lt: monthEnd },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
    }),
  ]);

  const totalRevenue = invoiceAgg._sum.total?.toNumber() ?? 0;
  const invoiceCount = invoiceAgg._count;

  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    totalRevenue,
    invoiceCount,
    orderCount,
    averageInvoiceValue: invoiceCount > 0 ? Math.round((totalRevenue / invoiceCount) * 100) / 100 : 0,
  };
}

/**
 * Profit for a single calendar month — revenue minus the cost snapshotted
 * on each invoiced order line at the time it was written. Invoices are
 * created per-delivery, so cost is pulled by joining each invoice's
 * delivery back to its order lines rather than off the Invoice row itself
 * (which only stores the selling total).
 */
export async function getProfitReportForMonth(year: number, month: number): Promise<ProfitReportDTO> {
  const { monthStart, monthEnd } = monthRange(year, month);

  const invoices = await prisma.invoice.findMany({
    where: { issueDate: { gte: monthStart, lt: monthEnd } },
    select: { total: true, deliveryId: true },
  });

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.total.toNumber(), 0);

  const deliveryIds = invoices.map((inv) => inv.deliveryId);
  const costAgg =
    deliveryIds.length > 0
      ? await prisma.orderLine.aggregate({
          where: { deliveryId: { in: deliveryIds } },
          _sum: { costTotal: true },
        })
      : null;

  const totalCost = costAgg?._sum.costTotal?.toNumber() ?? 0;
  const netProfit = Math.round((totalRevenue - totalCost) * 100) / 100;

  return {
    totalCost,
    netProfit,
    marginPct: totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 1000) / 10 : 0,
  };
}
