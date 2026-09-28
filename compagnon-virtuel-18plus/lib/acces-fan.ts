import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ErreurAcces } from "@/lib/session";

/**
 * Résout l'accès à un fan par son id :
 * - "self"     : le fan lui-même
 * - "createur" : le créateur du persona auquel le fan est rattaché
 */
export async function accesFan(fanId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ErreurAcces(401, "Non connecté.");
  const fan = await prisma.fan.findUnique({ where: { id: fanId }, include: { persona: true, user: true } });
  if (!fan) throw new ErreurAcces(404, "Fan introuvable.");
  if (fan.userId === session.user.id) return { fan, mode: "self" as const };
  if (session.user.role === "createur" && fan.persona.createurId === session.user.id) {
    return { fan, mode: "createur" as const };
  }
  throw new ErreurAcces(403, "Accès refusé.");
}

/** Vue publique d'un fan (jamais le hash du mot de passe ni l'e-mail complet côté créateur). */
export function vueFan(fan: Awaited<ReturnType<typeof accesFan>>["fan"], mode: "self" | "createur") {
  return {
    id: fan.id,
    pseudo: fan.pseudo,
    prenom: fan.prenom,
    anniversaire: fan.anniversaire,
    ton: fan.ton,
    sujetsAimes: fan.sujetsAimes,
    sujetsTabous: fan.sujetsTabous,
    safeWord: mode === "self" ? fan.safeWord : undefined,
    consentementDonne: fan.consentementDonne,
    consentementLe: fan.consentementLe,
    banni: fan.banni,
    banniRaison: fan.banniRaison,
    ageVerifie: fan.user.ageVerifie,
    email: mode === "self" ? fan.user.email : fan.user.email.replace(/^(.).*(@.*)$/, "$1•••$2"),
    createdAt: fan.createdAt,
  };
}
