import { NextResponse } from "next/server";
import { z } from "zod";
import { creerVideo, statutVideo } from "@/lib/avatar";
import { messageCompagnonAutorise } from "@/lib/messages";
import { preparerTexteVocal } from "@/lib/elevenlabs";
import { kv } from "@/lib/redis";
import { reponseErreur, utilisateurCourant } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** POST /api/avatar { messageId } → lance la génération D-ID (ou renvoie le cache). */
export async function POST(req: Request) {
  try {
    const body = z.object({ messageId: z.string().min(1) }).safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ erreur: "messageId requis." }, { status: 400 });
    const { texte, persona } = await messageCompagnonAutorise(body.data.messageId);
    const user = await utilisateurCourant();

    const etat = await creerVideo({
      texte: preparerTexteVocal(texte),
      sourceUrl: persona.avatarSourceUrl,
      voiceId: persona.voiceId,
    });
    // Mémorise qui a le droit de suivre cette vidéo
    if (user) await kv.set(`video-owner:${etat.talkId}:${user.id}`, "1", 60 * 60 * 12);
    return NextResponse.json(etat);
  } catch (e) {
    return reponseErreur(e);
  }
}

/** GET /api/avatar?id=talkId → statut (polling côté client toutes les ~2 s). */
export async function GET(req: Request) {
  try {
    const id = new URL(req.url).searchParams.get("id");
    const user = await utilisateurCourant();
    if (!id || !user) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
    if (!(await kv.get(`video-owner:${id}:${user.id}`))) {
      return NextResponse.json({ erreur: "Vidéo introuvable." }, { status: 404 });
    }
    return NextResponse.json(await statutVideo(id));
  } catch (e) {
    return reponseErreur(e);
  }
}
