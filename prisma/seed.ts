import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const userSeeds = [
    { name: "Ang Owner", email: "owner@angfinefoods.com", role: "OWNER" as const },
    { name: "Sam Sales", email: "sales@angfinefoods.com", role: "SALES_AGENT" as const },
    { name: "Cathy Accounts", email: "accounting@angfinefoods.com", role: "ACCOUNTING" as const },
  ];

  const users: Record<string, string> = {};
  for (const u of userSeeds) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
    users[u.role] = user.id;
  }

  const salesAgentId = users.SALES_AGENT;

  const customerSeeds = [
    { name: "Manila Grand Hotel", contactName: "Rosa Reyes", phone: "0917-555-0101" },
    { name: "Cebu Seafood Palace", contactName: "Ben Uy", phone: "0917-555-0102" },
    { name: "Baguio Frozen Mart", contactName: "Lea Cruz", phone: "0917-555-0103" },
  ];

  const customers: Record<string, string> = {};
  for (const c of customerSeeds) {
    const customer = await prisma.customer.upsert({
      where: { id: `seed-${c.name}` },
      update: {},
      create: {
        id: `seed-${c.name}`,
        name: c.name,
        contactName: c.contactName,
        phone: c.phone,
        salesAgentId,
      },
    });
    customers[c.name] = customer.id;
  }

  const productSeeds = [
    { sku: "FRZ-CHK-001", name: "Whole Chicken 1.2kg", unit: "pc", price: 210, track: true, stock: 500 },
    { sku: "FRZ-BEEF-002", name: "Beef Brisket 1kg", unit: "kg", price: 480, track: true, stock: 120 },
    { sku: "FRZ-PORK-003", name: "Pork Belly 1kg", unit: "kg", price: 320, track: true, stock: 200 },
    { sku: "FRZ-SHRIMP-004", name: "Shrimp Jumbo 1kg", unit: "kg", price: 650, track: true, stock: 40 },
    { sku: "FRZ-FRIES-005", name: "Crinkle Cut Fries 2.5kg", unit: "bag", price: 195, track: false, stock: 0 },
    { sku: "FRZ-VEG-006", name: "Mixed Vegetables 1kg", unit: "kg", price: 110, track: false, stock: 0 },
  ];

  const products: Record<string, string> = {};
  for (const p of productSeeds) {
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {},
      create: {
        sku: p.sku,
        name: p.name,
        unit: p.unit,
        defaultSellingPrice: p.price,
        trackInventory: p.track,
        currentStock: p.stock,
      },
    });
    products[p.sku] = product.id;
  }

  const supplierSeeds = ["Luzon Cold Chain Supply", "Visayas Frozen Distributors"];
  for (const name of supplierSeeds) {
    await prisma.supplier.upsert({
      where: { id: `seed-${name}` },
      update: {},
      create: { id: `seed-${name}`, name },
    });
  }

  // Manila Grand Hotel gets a negotiated rate on chicken and beef.
  await prisma.customerProductPrice.upsert({
    where: {
      customerId_productId: {
        customerId: customers["Manila Grand Hotel"],
        productId: products["FRZ-CHK-001"],
      },
    },
    update: {},
    create: {
      customerId: customers["Manila Grand Hotel"],
      productId: products["FRZ-CHK-001"],
      price: 195,
    },
  });
  await prisma.customerProductPrice.upsert({
    where: {
      customerId_productId: {
        customerId: customers["Manila Grand Hotel"],
        productId: products["FRZ-BEEF-002"],
      },
    },
    update: {},
    create: {
      customerId: customers["Manila Grand Hotel"],
      productId: products["FRZ-BEEF-002"],
      price: 455,
    },
  });

  console.log("Seeded demo users (password for all: password123):");
  userSeeds.forEach((u) => console.log(`  ${u.role.padEnd(12)} ${u.email}`));
  console.log(`Seeded ${customerSeeds.length} customers, ${productSeeds.length} products, ${supplierSeeds.length} suppliers.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
