import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { accesFan } from "@/lib/acces-fan";
import { ErreurAcces, reponseErreur } from "@/lib/session";
import { arreterGeneration } from "@/lib/abort-registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST { donne: boolean } : donner ou révoquer le consentement (révocation = chat bloqué immédiatement). */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const { fan, mode } = await accesFan(params.id);
    if (mode !== "self") throw new ErreurAcces(403, "Seul le fan peut modifier son consentement.");
    const body = z.object({ donne: z.boolean() }).safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });

    const maj = await prisma.fan.update({
      where: { id: fan.id },
      data: body.data.donne
        ? { consentementDonne: true, consentementLe: new Date(), consentementRevoqueLe: null }
        : { consentementDonne: false, consentementRevoqueLe: new Date() },
    });
    if (!body.data.donne) await arreterGeneration(fan.id);
    return NextResponse.json({ consentementDonne: maj.consentementDonne });
  } catch (e) {
    return reponseErreur(e);
  }
}
