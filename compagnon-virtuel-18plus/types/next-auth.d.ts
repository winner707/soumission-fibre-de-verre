import type { Role } from "@prisma/client";
import "next-auth";
import "next-auth/jwt";

// Champs ajoutés à la session et au JWT NextAuth
declare module "next-auth" {
  interface Session {
    user: { id: string; email: string; role: Role };
  }
  interface User {
    id: string;
    email: string;
    role: Role;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
