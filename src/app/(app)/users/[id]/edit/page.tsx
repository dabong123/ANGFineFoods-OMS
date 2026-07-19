import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth-guard";
import { getUserDetail } from "@/lib/data/users";
import { UserForm } from "@/components/users/user-form";

export default async function EditUserPage({ params }: { params: { id: string } }) {
  const session = await requirePermission("users:manage");
  const user = await getUserDetail(params.id);
  if (!user) notFound();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold tracking-tight">{user.name}</h1>
      <UserForm mode="edit" user={user} isSelf={user.id === session.user.id} />
    </div>
  );
}
