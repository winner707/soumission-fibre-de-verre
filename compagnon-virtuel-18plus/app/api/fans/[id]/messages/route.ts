import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dechiffrer } from "@/lib/crypto";
import { accesFan } from "@/lib/acces-fan";
import { ErreurAcces, reponseErreur } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET (créateur) : conversation d'un fan, déchiffrée côté serveur, pour la modération. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { fan, mode } = await accesFan(params.id);
    if (mode !== "createur") throw new ErreurAcces(403, "Réservé au créateur.");
    const messages = await prisma.message.findMany({ where: { fanId: fan.id }, orderBy: { createdAt: "asc" }, take: 500 });
    return NextResponse.json({
      messages: messages.map((m) => ({ id: m.id, auteur: m.auteur, texte: dechiffrer(m.contenuChiffre), verdict: m.verdict, createdAt: m.createdAt })),
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
