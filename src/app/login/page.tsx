import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getDefaultRoute } from "@/types";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) {
    redirect(getDefaultRoute(session.user.role));
  }

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-3">
          <Image
            src="/ang-fine-foods-logo.png"
            alt="ANG Fine Foods — Imported Meat, Seafoods, Delicatessen"
            width={700}
            height={522}
            priority
            className="mx-auto h-auto w-full max-w-[280px]"
          />
          <CardDescription className="text-center">
            Sign in to the Order Management System
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm />
        </CardContent>
      </Card>
    </div>
  );
}
