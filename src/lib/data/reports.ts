import { prisma } from "@/lib/prisma";
import type { SalesReportDTO } from "@/types/dto";

/** Revenue/orders for a single calendar month — lets past months stay
 * visible under Reports instead of only ever showing "this month" like
 * the Dashboard's Revenue (MTD) tile does. */
export async function getSalesReportForMonth(year: number, month: number): Promise<SalesReportDTO> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);

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
