import { NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";

import sql from "@/lib/db";

type DbUser = {
  id: string;
  email: string;
  password_hash: string | null;
  role: string;
  first_name: string | null;
  last_name: string | null;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

const adminEmails = (process.env.ADMIN_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: "/auth/sign-in" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email?.toString().toLowerCase().trim() ?? "";
        const password = credentials?.password?.toString() ?? "";

        if (!email || !password || !isValidEmail(email)) {
          throw new Error("Invalid email or password.");
        }

        const rows = (await sql`
          SELECT id, email, password_hash, role, first_name, last_name
          FROM public.users
          WHERE lower(email) = ${email}
          LIMIT 1
        `) as unknown as DbUser[];

        const user = rows[0];
        if (!user || !user.password_hash) {
          throw new Error("Invalid credentials.");
        }

        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
          throw new Error("Invalid credentials.");
        }

        let role = user.role || "customer";

        if (adminEmails.length && adminEmails.includes(email) && role !== "admin") {
          const updated = (await sql`
            UPDATE public.users
            SET role = 'admin', updated_at = now()
            WHERE id = ${user.id}
            RETURNING role
          `) as unknown as { role: string }[];
          role = updated[0]?.role ?? role;
        }

        const name = `${user.first_name ?? ""} ${user.last_name ?? ""}`.trim() || undefined;

        return {
          id: user.id,
          email: user.email,
          name,
          role,
          firstName: user.first_name ?? undefined,
          lastName: user.last_name ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role ?? "customer";
        token.firstName = (user as any).firstName ?? undefined;
        token.lastName = (user as any).lastName ?? undefined;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.role = (token as any).role ?? "customer";
        session.user.id = token.sub ?? "";
        session.user.firstName = (token as any).firstName ?? undefined;
        session.user.lastName = (token as any).lastName ?? undefined;
      }
      return session;
    },
  },
};
