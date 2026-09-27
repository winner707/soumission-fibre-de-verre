import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { accesFan, vueFan } from "@/lib/acces-fan";
import { ErreurAcces, reponseErreur } from "@/lib/session";
import { arreterGeneration } from "@/lib/abort-registry";
import { purgerMemoire } from "@/lib/memoire";
import { anonymiser } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: { id: string } };

export async function GET(_req: Request, { params }: Ctx) {
  try {
    const { fan, mode } = await accesFan(params.id);
    return NextResponse.json(vueFan(fan, mode));
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH (créateur) : bannir / réintégrer un fan. */
export async function PATCH(req: Request, { params }: Ctx) {
  try {
    const { fan, mode } = await accesFan(params.id);
    if (mode !== "createur") throw new ErreurAcces(403, "Réservé au créateur.");
    const body = z
      .object({ banni: z.boolean(), raison: z.string().max(300).optional() })
      .safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

    const maj = await prisma.fan.update({
      where: { id: fan.id },
      data: body.data.banni
        ? { banni: true, banniRaison: body.data.raison ?? null, banniLe: new Date() }
        : { banni: false, banniRaison: null, banniLe: null },
      include: { persona: true, user: true },
    });
    if (body.data.banni) await arreterGeneration(fan.id);
    return NextResponse.json(vueFan(maj, mode));
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * DELETE : droit à l'oubli. Supprime le compte, le profil fan, tous les messages (cascade),
 * la mémoire Redis et les entrées du journal de modération associées.
 */
export async function DELETE(_req: Request, { params }: Ctx) {
  try {
    const { fan } = await accesFan(params.id);
    await arreterGeneration(fan.id);
    await purgerMemoire(fan.id);
    await prisma.moderationLog.deleteMany({ where: { fanHash: anonymiser(fan.id) } });
    await prisma.user.delete({ where: { id: fan.userId } });
    return NextResponse.json({ supprime: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
