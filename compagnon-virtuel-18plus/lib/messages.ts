import { prisma } from "@/lib/prisma";
import { dechiffrer } from "@/lib/crypto";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { ErreurAcces, exigerFan } from "@/lib/session";

/**
 * Récupère un message du COMPAGNON déjà modéré et enregistré.
 * L'audio et la vidéo ne sont générés qu'à partir de ces messages validés,
 * jamais à partir d'un texte libre envoyé par le client.
 * Accès : le fan propriétaire, ou le créateur du persona.
 */
export async function messageCompagnonAutorise(messageId: string) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) throw new ErreurAcces(401, "Non connecté.");

  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: { fan: { include: { persona: true } } },
  });
  if (!message || message.auteur !== "compagnon") throw new ErreurAcces(404, "Message introuvable.");

  if (session.user.role === "createur") {
    if (message.fan.persona.createurId !== session.user.id) throw new ErreurAcces(403, "Accès refusé.");
  } else {
    const fan = await exigerFan();
    if (fan.id !== message.fanId) throw new ErreurAcces(403, "Accès refusé.");
  }
  return { texte: dechiffrer(message.contenuChiffre), persona: message.fan.persona, fanId: message.fanId };
}
