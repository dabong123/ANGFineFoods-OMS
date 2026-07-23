import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

/**
 * Supabase's pooled connection (DATABASE_URL, PgBouncer transaction mode)
 * can drop a Prisma interactive transaction's session between round trips
 * on Prisma's 5s default, surfacing as "Transaction not found" / "refers to
 * an old closed transaction" — not a real timeout, just the pooler
 * reassigning the connection. Give multi-step transactions (several lines,
 * each with a few queries) more room than the default.
 */
export const TRANSACTION_OPTIONS = { timeout: 15000, maxWait: 10000 };
