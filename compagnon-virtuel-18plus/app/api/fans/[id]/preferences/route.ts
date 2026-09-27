import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accesFan, vueFan } from "@/lib/acces-fan";
import { SchemaPreferences } from "@/lib/validations";
import { ErreurAcces, reponseErreur } from "@/lib/session";
import { lireFaits } from "@/lib/memoire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

/** GET : préférences + ce que le compagnon a mémorisé (transparence). */
export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { fan, mode } = await accesFan(params.id);
    if (mode !== "self") throw new ErreurAcces(403, "Réservé au fan.");
    return NextResponse.json({ ...vueFan(fan, mode), memoire: await lireFaits(fan.id) });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PUT : ton, sujets aimés, sujets tabous, safe word, prénom, anniversaire. */
export async function PUT(req: Request, { params }: Ctx) {
  try {
    const { fan, mode } = await accesFan(params.id);
    if (mode !== "self") throw new ErreurAcces(403, "Réservé au fan.");
    const parsed = SchemaPreferences.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const d = parsed.data;
    const maj = await prisma.fan.update({
      where: { id: fan.id },
      data: {
        prenom: d.prenom || null,
        anniversaire: d.anniversaire || null,
        ton: d.ton,
        sujetsAimes: d.sujetsAimes,
        sujetsTabous: d.sujetsTabous,
        safeWord: d.safeWord,
      },
      include: { persona: true, user: true },
    });
    return NextResponse.json(vueFan(maj, mode));
  } catch (e) {
    return reponseErreur(e);
  }
}
