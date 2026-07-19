import type { NextAuthConfig } from "next-auth";
import { canAny, ROUTE_PERMISSIONS } from "@/types";

/**
 * Edge-safe config: no Prisma/bcrypt here so this can run in middleware.
 * The Credentials provider (which needs the database) is added in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  callbacks: {
    // No DB access needed here (just copying JWT fields onto the session),
    // so this must live in the edge-safe config: middleware runs this same
    // config without the Credentials provider, and needs `auth.user.role`
    // populated to make routing decisions in `authorized` below.
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
      }
      return session;
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl;
      const isPublic = pathname === "/login" || pathname.startsWith("/api/auth");
      if (isPublic) return true;

      const isLoggedIn = !!auth?.user;
      if (!isLoggedIn) return false;

      const role = auth.user.role;
      const match = ROUTE_PERMISSIONS.find((r) => pathname.startsWith(r.prefix));
      if (!match) return true;
      return canAny(role, match.permissions);
    },
  },
  providers: [],
} satisfies NextAuthConfig;
