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

        // Anti-bruteforce simple : 10 tentatives / 15 min par e-mail.
        // Si Redis est en panne, on n'empêche pas la connexion (on le signale seulement).
        try {
          const essais = await kv.incr(`login:${email}`, 15 * 60);
          if (essais > 10) throw new Error("TROP_DE_TENTATIVES");
        } catch (e) {
          if ((e as Error).message === "TROP_DE_TENTATIVES") throw e;
          console.error("[auth] compteur anti-bruteforce indisponible (Redis) :", (e as Error).message);
        }

        let user;
        try {
          user = await prisma.user.findUnique({ where: { email } });
        } catch (e) {
          console.error("[auth] base de données injoignable :", (e as Error).message);
          throw new Error("BASE_INDISPONIBLE");
        }
        if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return null;
        await kv.del(`login:${email}`).catch(() => undefined);
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
