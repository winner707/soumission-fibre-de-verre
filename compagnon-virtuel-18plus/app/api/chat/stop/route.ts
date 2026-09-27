import { NextResponse } from "next/server";
import { z } from "zod";
import { exigerFan, reponseErreur } from "@/lib/session";
import { arreterGeneration } from "@/lib/abort-registry";
import { effacerContexteRecent } from "@/lib/memoire";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Bouton « Stop » : coupe immédiatement toute génération en cours.
 * `effacerContexte: true` efface aussi le contexte récent (le compagnon « oublie » les derniers échanges).
 */
export async function POST(req: Request) {
  try {
    // Pas d'exigence de consentement : on doit toujours pouvoir tout arrêter
    const fan = await exigerFan({ consentement: false });
    const body = z.object({ effacerContexte: z.boolean().optional() }).safeParse(await req.json().catch(() => ({})));
    await arreterGeneration(fan.id);
    if (body.success && body.data.effacerContexte) await effacerContexteRecent(fan.id);
    return NextResponse.json({ ok: true, contexteEfface: Boolean(body.success && body.data.effacerContexte) });
  } catch (e) {
    return reponseErreur(e);
  }
}
