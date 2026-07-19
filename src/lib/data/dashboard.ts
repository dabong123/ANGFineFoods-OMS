import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/format";
import type { DashboardMetric } from "@/types/dto";
import type { Session } from "next-auth";

const OPEN_ORDER_STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "PARTIALLY_DELIVERED"] as const;

function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getDashboardMetrics(session: Session): Promise<DashboardMetric[]> {
  switch (session.user.role) {
    case "OWNER":
      return getOwnerMetrics();
    case "ACCOUNTING":
      return getAccountingMetrics();
    case "SALES_AGENT":
      return getSalesAgentMetrics(session.user.id);
    default:
      return [];
  }
}

async function getOwnerMetrics(): Promise<DashboardMetric[]> {
  const monthStart = startOfMonth();
  const now = new Date();

  const [openOrders, revenueMtd, outstandingAr, overdueCount] = await Promise.all([
    prisma.order.count({ where: { status: { in: [...OPEN_ORDER_STATUSES] } } }),
    prisma.invoice.aggregate({
      where: { issueDate: { gte: monthStart } },
      _sum: { total: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      _sum: { balance: true },
    }),
    prisma.invoice.count({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] }, dueDate: { lt: now } },
    }),
  ]);

  return [
    { label: "Open Orders", value: String(openOrders) },
    { label: "Revenue (MTD)", value: formatMoney(revenueMtd._sum.total?.toNumber() ?? 0) },
    { label: "Outstanding AR", value: formatMoney(outstandingAr._sum.balance?.toNumber() ?? 0) },
    { label: "Overdue Invoices", value: String(overdueCount) },
  ];
}

async function getAccountingMetrics(): Promise<DashboardMetric[]> {
  const monthStart = startOfMonth();
  const now = new Date();

  const [outstandingAr, overdueAgg, revenueMtd, unpaidCount] = await Promise.all([
    prisma.invoice.aggregate({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } },
      _sum: { balance: true },
    }),
    prisma.invoice.aggregate({
      where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] }, dueDate: { lt: now } },
      _sum: { balance: true },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { issueDate: { gte: monthStart } },
      _sum: { total: true },
    }),
    prisma.invoice.count({ where: { status: { in: ["UNPAID", "PARTIALLY_PAID"] } } }),
  ]);

  return [
    { label: "Outstanding AR", value: formatMoney(outstandingAr._sum.balance?.toNumber() ?? 0) },
    {
      label: "Overdue Invoices",
      value: String(overdueAgg._count),
      sublabel: `${formatMoney(overdueAgg._sum.balance?.toNumber() ?? 0)} overdue`,
    },
    { label: "Revenue (MTD)", value: formatMoney(revenueMtd._sum.total?.toNumber() ?? 0) },
    { label: "Unpaid Invoices", value: String(unpaidCount) },
  ];
}

async function getSalesAgentMetrics(userId: string): Promise<DashboardMetric[]> {
  const monthStart = startOfMonth();

  const [openOrders, ordersThisMonth, valueThisMonthAgg, customerCount] = await Promise.all([
    prisma.order.count({
      where: { salesAgentId: userId, status: { in: [...OPEN_ORDER_STATUSES] } },
    }),
    prisma.order.count({
      where: { salesAgentId: userId, createdAt: { gte: monthStart } },
    }),
    prisma.order.aggregate({
      where: {
        salesAgentId: userId,
        createdAt: { gte: monthStart },
        status: { notIn: ["CANCELLED", "REJECTED"] },
      },
      _sum: { total: true },
    }),
    prisma.customer.count({ where: { salesAgentId: userId, isActive: true } }),
  ]);

  return [
    { label: "My Open Orders", value: String(openOrders) },
    { label: "My Orders (MTD)", value: String(ordersThisMonth) },
    { label: "My Order Value (MTD)", value: formatMoney(valueThisMonthAgg._sum.total?.toNumber() ?? 0) },
    { label: "My Customers", value: String(customerCount) },
  ];
}
