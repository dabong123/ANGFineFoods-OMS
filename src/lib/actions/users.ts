"use server";

import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth-guard";
import { can } from "@/types";
import { createUserSchema, updateUserSchema, type CreateUserInput, type UpdateUserInput } from "@/lib/validations/user";

async function requireManageUsers() {
  const session = await requireSession();
  if (!can(session.user.role, "users:manage")) {
    throw new Error("Not authorized to manage users");
  }
  return session;
}

export async function createUser(input: CreateUserInput): Promise<{ userId: string }> {
  await requireManageUsers();
  const parsed = createUserSchema.parse(input);

  const passwordHash = await bcrypt.hash(parsed.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: parsed.name,
        email: parsed.email.toLowerCase(),
        passwordHash,
        role: parsed.role,
      },
    });
    revalidatePath("/users");
    return { userId: user.id };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That email is already in use");
    }
    throw e;
  }
}

export async function updateUser(userId: string, input: UpdateUserInput): Promise<void> {
  const session = await requireManageUsers();
  const parsed = updateUserSchema.parse(input);

  const isSelf = userId === session.user.id;
  if (isSelf && (parsed.role !== "OWNER" || !parsed.isActive)) {
    throw new Error("You can't remove your own owner access or deactivate yourself");
  }

  const data: Prisma.UserUpdateInput = {
    name: parsed.name,
    email: parsed.email.toLowerCase(),
    role: parsed.role,
    isActive: parsed.isActive,
  };
  if (parsed.password) {
    data.passwordHash = await bcrypt.hash(parsed.password, 10);
  }

  try {
    await prisma.user.update({ where: { id: userId }, data });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new Error("That email is already in use");
    }
    throw e;
  }

  revalidatePath("/users");
  revalidatePath(`/users/${userId}`);
}
