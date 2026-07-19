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
- [ ] Invoice generation on delivery + AR
- [ ] Dashboard metrics wired to real data

Note: customer/product/supplier records themselves are managed only via
`prisma/seed.ts` for now — there's no admin CRUD UI for master data yet.
That's a separate concern from the order-creation workflow this milestone
covers.

The Prisma schema (`prisma/schema.prisma`) already models the full domain
(orders, order lines, purchase requests, inventory, deliveries, invoices,
payments) so later milestones build on a stable schema rather than churning
it per-feature.

## Open decision: delivery flow

The schema is currently 1:1 `Order` → `Delivery`. For an order with mixed
storage/supplier lines, should it ship as **one delivery** once everything is
ready, or **split** into partial deliveries per fulfillment readiness? This
needs an answer before the delivery-creation flow (milestone 3) is built.
