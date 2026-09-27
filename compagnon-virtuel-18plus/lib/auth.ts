import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { kv } from "@/lib/redis";

/**
 * NextAuth : connexion e-mail + mot de passe, sessions JWT.
 * Le rôle (createur | fan) est porté par le jeton ; l'état de vérification d'âge,
 * le consentement et le bannissement sont relus en base à chaque requête sensible
 * (voir lib/session.ts), pour être toujours à jour.
 */
const SchemaConnexion = z.object({ email: z.string().email(), password: z.string().min(1) });

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt", maxAge: 60 * 60 * 24 * 7 },
  pages: { signIn: "/connexion" },
  providers: [
    CredentialsProvider({
      name: "Identifiants",
      credentials: { email: { label: "E-mail", type: "email" }, password: { label: "Mot de passe", type: "password" } },
      async authorize(credentials) {
        const parsed = SchemaConnexion.safeParse(credentials);
        if (!parsed.success) return null;
        const email = parsed.data.email.toLowerCase();

        // Anti-bruteforce simple : 10 tentatives / 15 min par e-mail
        const essais = await kv.incr(`login:${email}`, 15 * 60);
        if (essais > 10) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        await kv.del(`login:${email}`);
        return { id: user.id, email: user.email, role: user.role };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      session.user = { id: token.id, email: token.email ?? "", role: token.role };
      return session;
    },
  },
};
