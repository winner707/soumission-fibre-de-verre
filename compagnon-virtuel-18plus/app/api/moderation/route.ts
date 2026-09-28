import { NextResponse } from "next/server";
import { z } from "zod";
import { moderer } from "@/lib/moderation";
import { exigerCreateur, reponseErreur } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { texte, direction? } (créateur) : tester le filtre de modération. */
export async function POST(req: Request) {
  try {
    const createur = await exigerCreateur();
    const body = z
      .object({ texte: z.string().min(1).max(4000), direction: z.enum(["entree", "sortie"]).default("entree") })
      .safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
    const resultat = await moderer(body.data.texte, body.data.direction, { limitesCreateur: createur.persona?.limites ?? [] });
    return NextResponse.json(resultat);
  } catch (e) {
    return reponseErreur(e);
  }
}

/** GET (créateur) : statistiques anonymisées de modération sur 30 jours. */
export async function GET() {
  try {
    await exigerCreateur();
    const depuis = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const stats = await prisma.moderationLog.groupBy({
      by: ["verdict", "direction"],
      where: { createdAt: { gte: depuis } },
      _count: true,
    });
    return NextResponse.json({ stats });
  } catch (e) {
    return reponseErreur(e);
  }
}
