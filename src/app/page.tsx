import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDefaultRoute } from "@/types";

export default async function Home() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  redirect(getDefaultRoute(session.user.role));
}
