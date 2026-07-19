import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = await bcrypt.hash("password123", 10);

  const users = [
    { name: "Ang Owner", email: "owner@angfinefoods.com", role: "OWNER" as const },
    { name: "Sam Sales", email: "sales@angfinefoods.com", role: "SALES_AGENT" as const },
    { name: "Cathy Accounts", email: "accounting@angfinefoods.com", role: "ACCOUNTING" as const },
  ];

  for (const u of users) {
    await prisma.user.upsert({
      where: { email: u.email },
      update: {},
      create: { ...u, passwordHash: password },
    });
  }

  console.log("Seeded demo users (password for all: password123):");
  users.forEach((u) => console.log(`  ${u.role.padEnd(12)} ${u.email}`));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
