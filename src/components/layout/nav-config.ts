import type { Permission } from "@/types";

export type NavItem = {
  label: string;
  href: string;
  permissions: Permission[];
};

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", permissions: ["dashboard:view"] },
  {
    label: "Orders",
    href: "/orders",
    permissions: ["orders:view:own", "orders:view:all"],
  },
  {
    label: "Customers",
    href: "/customers",
    permissions: ["customers:view:own", "customers:view:all"],
  },
  { label: "Invoices", href: "/invoices", permissions: ["invoices:view"] },
  {
    label: "Purchase Requests",
    href: "/purchase-requests",
    permissions: ["purchaseRequests:manage"],
  },
  { label: "Products", href: "/products", permissions: ["products:manage"] },
  { label: "Suppliers", href: "/suppliers", permissions: ["suppliers:manage"] },
  {
    label: "Reports",
    href: "/reports",
    permissions: ["reports:ar:view", "reports:sales:view"],
  },
  { label: "Users", href: "/users", permissions: ["users:manage"] },
];
