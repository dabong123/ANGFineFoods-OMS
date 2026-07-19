import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { can, canAny, type Permission } from "@/types";

export async function requireSession() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!can(session.user.role, permission)) {
    redirect("/");
  }
  return session;
}

export async function requireAnyPermission(permissions: Permission[]) {
  const session = await requireSession();
  if (!canAny(session.user.role, permissions)) {
    redirect("/");
  }
  return session;
}
