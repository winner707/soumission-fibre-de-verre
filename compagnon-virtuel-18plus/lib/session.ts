import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Fan, Persona, User } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Contrôles d'accès côté serveur (routes API et pages).
 * Chaque garde relit la base : un fan banni ou ayant révoqué son consentement
 * est bloqué immédiatement, même avec un jeton encore valide.
 */

export class ErreurAcces extends Error {
  constructor(
    public statut: number,
    message: string,
    public code?: string,
  ) {
    super(message);
  }
}

export async function utilisateurCourant(): Promise<User | null> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  return prisma.user.findUnique({ where: { id: session.user.id } });
}

export async function exigerCreateur(): Promise<User & { persona: Persona | null }> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ErreurAcces(401, "Non connecté.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, include: { persona: true } });
  if (!user || user.role !== "createur") throw new ErreurAcces(403, "Réservé au créateur.");
  return user;
}

export type FanComplet = Fan & { user: User; persona: Persona };

/**
 * Garde « fan » : connecté, 18+ vérifié, consentement actif, non banni, persona actif.
 * `options.consentement = false` permet d'accéder aux préférences / données sans consentement.
 */
export async function exigerFan(options: { consentement?: boolean } = {}): Promise<FanComplet> {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ErreurAcces(401, "Non connecté.");
  const fan = await prisma.fan.findUnique({
    where: { userId: session.user.id },
    include: { user: true, persona: true },
  });
  if (!fan) throw new ErreurAcces(403, "Profil fan introuvable.");
  if (!fan.user.ageVerifie) throw new ErreurAcces(403, "Vérification d'âge requise.", "AGE");
  if (fan.banni) throw new ErreurAcces(403, "Accès suspendu par le créateur.", "BANNI");
  if (options.consentement !== false && !fan.consentementDonne) {
    throw new ErreurAcces(403, "Consentement requis.", "CONSENTEMENT");
  }
  if (options.consentement !== false && !fan.persona.actif) {
    throw new ErreurAcces(503, "Le personnage est momentanément indisponible.", "PERSONA");
  }
  return fan;
}

/** Transforme une erreur en réponse JSON propre. */
export function reponseErreur(e: unknown): NextResponse {
  if (e instanceof ErreurAcces) {
    return NextResponse.json({ erreur: e.message, code: e.code }, { status: e.statut });
  }
  console.error(e);
  return NextResponse.json({ erreur: "Erreur interne." }, { status: 500 });
}
