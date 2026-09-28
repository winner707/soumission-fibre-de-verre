import { NextResponse } from "next/server";
import { z } from "zod";
import { preparerTexteVocal, syntheseStream } from "@/lib/elevenlabs";
import { messageCompagnonAutorise } from "@/lib/messages";
import { exigerCreateur, reponseErreur } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const entetesAudio = (depuisCache: boolean) => ({
  "Content-Type": "audio/mpeg",
  "Cache-Control": "private, max-age=3600",
  // Mention obligatoire : contenu généré par IA
  "X-AI-Generated": "true",
  "X-Cache": depuisCache ? "HIT" : "MISS",
});

/**
 * GET /api/tts?messageId=… → audio/mpeg en streaming.
 * Utilisable directement comme `src` d'un <audio> : la lecture démarre dès les premiers octets.
 */
export async function GET(req: Request) {
  try {
    const messageId = new URL(req.url).searchParams.get("messageId");
    if (!messageId) return NextResponse.json({ erreur: "messageId requis." }, { status: 400 });
    const { texte, persona } = await messageCompagnonAutorise(messageId);
    const { flux, depuisCache } = await syntheseStream(preparerTexteVocal(texte), persona.voiceId);
    return new Response(flux, { headers: entetesAudio(depuisCache) });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** POST /api/tts { texte } → aperçu de voix, réservé au créateur (page persona). */
export async function POST(req: Request) {
  try {
    const createur = await exigerCreateur();
    const body = z.object({ texte: z.string().min(1).max(300) }).safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ erreur: "Texte invalide." }, { status: 400 });
    const { flux, depuisCache } = await syntheseStream(preparerTexteVocal(body.data.texte), createur.persona?.voiceId);
    return new Response(flux, { headers: entetesAudio(depuisCache) });
  } catch (e) {
    return reponseErreur(e);
  }
}
