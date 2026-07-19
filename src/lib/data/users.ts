import { prisma } from "@/lib/prisma";
import type { UserDetailDTO, UserListItemDTO } from "@/types/dto";

export async function getUsers(): Promise<UserListItemDTO[]> {
  const users = await prisma.user.findMany({
    orderBy: { name: "asc" },
  });

  return users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    createdAt: u.createdAt.toISOString(),
  }));
}

export async function getUserDetail(userId: string): Promise<UserDetailDTO | null> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
  };
}
