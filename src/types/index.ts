import type { Role } from "@prisma/client";

export type { Role };

/**
 * Every gate-able action in the system. "own" permissions mean the role may
 * act on records where they are the assigned sales agent — the permission
 * map only decides visibility of the capability, row-level scoping (e.g.
 * `where: { salesAgentId: session.user.id }`) still has to be applied at the
 * data-access layer for every "own" permission.
 */
export type Permission =
  | "dashboard:view"
  | "customers:view:own"
  | "customers:view:all"
  | "customers:create"
  | "customers:edit:own"
  | "customers:edit:all"
  | "orders:view:own"
  | "orders:view:all"
  | "orders:create"
  | "orders:edit:own"
  | "orders:edit:all"
  | "orders:approve"
  | "orders:cancel:own"
  | "orders:cancel:all"
  | "pricing:edit"
  | "products:manage"
  | "suppliers:manage"
  | "purchaseRequests:manage"
  | "deliveries:create"
  | "invoices:view"
  | "invoices:create"
  | "invoices:edit"
  | "payments:record"
  | "reports:ar:view"
  | "reports:sales:view"
  | "users:manage";

const OWNER_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "customers:view:own",
  "customers:view:all",
  "customers:create",
  "customers:edit:own",
  "customers:edit:all",
  "orders:view:own",
  "orders:view:all",
  "orders:create",
  "orders:edit:own",
  "orders:edit:all",
  "orders:approve",
  "orders:cancel:own",
  "orders:cancel:all",
  "pricing:edit",
  "products:manage",
  "suppliers:manage",
  "purchaseRequests:manage",
  "deliveries:create",
  "invoices:view",
  "invoices:create",
  "invoices:edit",
  "payments:record",
  "reports:ar:view",
  "reports:sales:view",
  "users:manage",
];

const SALES_AGENT_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "customers:view:own",
  "customers:create",
  "customers:edit:own",
  "orders:view:own",
  "orders:create",
  "orders:edit:own",
  "orders:cancel:own",
];

const ACCOUNTING_PERMISSIONS: Permission[] = [
  "dashboard:view",
  "customers:view:all",
  "orders:view:all",
  "invoices:view",
  "invoices:create",
  "invoices:edit",
  "payments:record",
  "reports:ar:view",
  "reports:sales:view",
];

export const PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: OWNER_PERMISSIONS,
  SALES_AGENT: SALES_AGENT_PERMISSIONS,
  ACCOUNTING: ACCOUNTING_PERMISSIONS,
};

export function can(role: Role, permission: Permission): boolean {
  return PERMISSIONS[role].includes(permission);
}

export function canAny(role: Role, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p));
}

/** Where to send a user right after login, and the fallback for "/". */
export function getDefaultRoute(role: Role): string {
  switch (role) {
    case "OWNER":
      return "/dashboard";
    case "SALES_AGENT":
      return "/orders";
    case "ACCOUNTING":
      return "/invoices";
    default:
      return "/dashboard";
  }
}

/**
 * Route prefixes gated by the middleware, in order of specificity. A role
 * needs at least one of the listed permissions to enter a matching route.
 */
export const ROUTE_PERMISSIONS: { prefix: string; permissions: Permission[] }[] = [
  { prefix: "/dashboard", permissions: ["dashboard:view"] },
  { prefix: "/customers", permissions: ["customers:view:own", "customers:view:all"] },
  { prefix: "/orders", permissions: ["orders:view:own", "orders:view:all"] },
  { prefix: "/products", permissions: ["products:manage"] },
  { prefix: "/suppliers", permissions: ["suppliers:manage"] },
  { prefix: "/purchase-requests", permissions: ["purchaseRequests:manage"] },
  { prefix: "/invoices", permissions: ["invoices:view"] },
  { prefix: "/reports", permissions: ["reports:ar:view", "reports:sales:view"] },
  { prefix: "/users", permissions: ["users:manage"] },
];
