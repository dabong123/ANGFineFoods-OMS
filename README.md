# ANG Fine Foods — Order Management System

Internal OMS for a frozen-food trading & distribution company: order intake,
customer-specific pricing, mixed storage/supplier fulfillment, purchase
requests, invoicing, and AR.

## Stack

Next.js 14 (App Router) · TypeScript · Prisma · PostgreSQL (Supabase) ·
Tailwind CSS · shadcn/ui · React Hook Form + Zod · TanStack Table · Auth.js v5

## Getting started

```bash
npm install
cp .env.example .env   # fill in DATABASE_URL / DIRECT_URL / AUTH_SECRET
npx prisma migrate dev
npm run prisma:seed    # creates one demo user per role, password: password123
npm run dev
```

Demo logins after seeding:

| Role         | Email                        |
| ------------ | ----------------------------- |
| Owner        | owner@angfinefoods.com        |
| Sales Agent  | sales@angfinefoods.com        |
| Accounting   | accounting@angfinefoods.com   |

## Roles & permissions

Three roles — `OWNER`, `SALES_AGENT`, `ACCOUNTING` — gated via the permission
map in `src/types/index.ts` and enforced in `src/middleware.ts` (route-level)
and `src/lib/auth-guard.ts` (server actions / server components). Sales
agents are scoped to their own customers and orders and cannot edit pricing;
accounting has read access to orders/customers plus invoicing, payments, and
AR reporting; owner has full access.

## Project status

- [x] Auth.js — credentials login, JWT session, role-gated middleware
- [x] Order creation — customer/product picker with auto-applied pricing,
      per-line fulfillment source (storage/supplier), purchase request
      generation, create/edit/approve/cancel server actions
- [x] Delivery + invoicing + AR — split deliveries (a line ships once, but
      different lines on the same order can ship in different deliveries),
      one invoice per delivery, payment recording, AR aging
- [x] Dashboard metrics wired to real aggregates, tailored per role (owner:
      open orders / revenue MTD / outstanding AR / overdue invoices;
      accounting: outstanding AR / overdue / revenue MTD / unpaid invoice
      count; sales agent: own open orders / orders MTD / order value MTD /
      customer count — scoped to their own book, no AR or company revenue
      exposed to a role that can't see invoices)

All four milestones from the original brief are in. Remaining gaps are
noted below (product/supplier CRUD, delivery/PR ops restricted to owner)
rather than silently out of scope.

- [x] Customer management — create/edit UI at `/customers`, `/customers/new`.
      Sales agents create customers pinned to themselves and can only edit
      their own; owner can create/edit any customer and reassign the sales
      agent; accounting is read-only (matches the existing permission map,
      no new permissions needed).
- [x] User management — create/edit UI at `/users`, owner-only. Owner sets
      an initial password directly on create (no email/invite flow — there's
      no email-sending infrastructure in this app) and can reset any user's
      password from the edit page. A self-lockout guard (client- and
      server-side) stops the owner from demoting or deactivating their own
      account, since there's no recovery path if the only owner account
      gets locked out.

Note: products and suppliers are still managed only via `prisma/seed.ts` —
there's no admin CRUD UI for those yet.

The Prisma schema (`prisma/schema.prisma`) already models the full domain
(orders, order lines, purchase requests, inventory, deliveries, invoices,
payments) so later milestones build on a stable schema rather than churning
it per-feature.

## Delivery & invoicing model

Resolved: deliveries **split** — an `OrderLine` always ships whole (its
quantity is never divided across deliveries), but different lines on the
same `Order` can go out in different `Delivery` records as each becomes
ready (storage lines are ready once approved; supplier lines only once
their `PurchaseRequest` is marked received). Each `Delivery` bills as its
own `Invoice` — customers are billed as goods ship, not held until the
whole order is complete. `Order.status` becomes `PARTIALLY_DELIVERED` once
some but not all lines have shipped, `DELIVERED` once all have.

Payment terms are a flat 30-day net, not yet customer-configurable
(`DEFAULT_PAYMENT_TERMS_DAYS` in `src/lib/delivery-engine.ts`). Invoice
"overdue" is derived at query time from `dueDate` + `balance` rather than
stored, so AR aging never goes stale without a background job.

Delivery creation and purchase-request status changes (mark
ordered/received) are owner-only for now (`deliveries:create` /
`purchaseRequests:manage`) — there's no dedicated warehouse/ops role in the
three-role system, and this felt closer to procurement than to accounting
or sales.
