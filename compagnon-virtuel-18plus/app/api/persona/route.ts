import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SchemaPersona } from "@/lib/validations";
import { exigerCreateur, reponseErreur } from "@/lib/session";
import { LIMITES_GLOBALES } from "@/lib/limites";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET : persona du créateur + limites globales (affichées, non modifiables). */
export async function GET() {
  try {
    const createur = await exigerCreateur();
    return NextResponse.json({ persona: createur.persona, limitesGlobales: LIMITES_GLOBALES });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PUT : création ou mise à jour du persona. */
export async function PUT(req: Request) {
  try {
    const createur = await exigerCreateur();
    const parsed = SchemaPersona.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ erreur: parsed.error.issues[0]?.message ?? "Données invalides." }, { status: 400 });
    }
    const d = parsed.data;
    if (d.actif && !d.droitsImageVoix) {
      return NextResponse.json(
        { erreur: "Vous devez attester détenir les droits sur la voix et l'image (accord écrit si personne réelle) avant d'activer le persona." },
        { status: 400 },
      );
    }
    const data = { ...d, voiceId: d.voiceId || null, avatarSourceUrl: d.avatarSourceUrl || null };
    const persona = await prisma.persona.upsert({
      where: { createurId: createur.id },
      update: data,
      create: { ...data, createurId: createur.id },
    });
    return NextResponse.json({ persona });
  } catch (e) {
    return reponseErreur(e);
  }
}
