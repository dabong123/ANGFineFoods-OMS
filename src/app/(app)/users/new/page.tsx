import { requirePermission } from "@/lib/auth-guard";
import { UserForm } from "@/components/users/user-form";

export default async function NewUserPage() {
  await requirePermission("users:manage");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">New user</h1>
      <UserForm mode="create" />
    </div>
  );
}
