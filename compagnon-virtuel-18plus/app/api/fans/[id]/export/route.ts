import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { dechiffrer } from "@/lib/crypto";
import { accesFan, vueFan } from "@/lib/acces-fan";
import { ErreurAcces, reponseErreur } from "@/lib/session";
import { lireFaits } from "@/lib/memoire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET : export RGPD (portabilité) de toutes les données du fan, en JSON. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  try {
    const { fan, mode } = await accesFan(params.id);
    if (mode !== "self") throw new ErreurAcces(403, "Réservé au fan.");
    const messages = await prisma.message.findMany({ where: { fanId: fan.id }, orderBy: { createdAt: "asc" } });
    const donnees = {
      exporteLe: new Date().toISOString(),
      profil: { ...vueFan(fan, mode), dateNaissance: fan.user.dateNaissance, ageMethode: fan.user.ageMethode },
      memoireCompagnon: await lireFaits(fan.id),
      messages: messages.map((m) => ({ auteur: m.auteur, texte: dechiffrer(m.contenuChiffre), date: m.createdAt })),
      mention: "Les réponses du compagnon sont générées par IA.",
    };
    return new NextResponse(JSON.stringify(donnees, null, 2), {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": `attachment; filename="mes-donnees-${fan.id}.json"`,
      },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
