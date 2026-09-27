import { NextResponse } from "next/server";
import { z } from "zod";
import { creerStream, envoyerIce, envoyerReponseSdp, fermerStream, parlerStream } from "@/lib/avatar";
import { messageCompagnonAutorise } from "@/lib/messages";
import { preparerTexteVocal } from "@/lib/elevenlabs";
import { ErreurAcces, exigerFan, reponseErreur } from "@/lib/session";
import { kv } from "@/lib/redis";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Signalisation WebRTC pour l'avatar D-ID en temps réel (option, DID_STREAMING=true).
 * Le navigateur établit la connexion WebRTC directement avec D-ID ; ce serveur
 * ne fait que relayer l'offre/réponse SDP et les candidats ICE (la clé API reste côté serveur).
 * Seuls des messages déjà modérés peuvent être prononcés ("parler" prend un messageId).
 */
const Schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("creer") }),
  z.object({ action: z.literal("sdp"), streamId: z.string(), sessionId: z.string(), answer: z.any() }),
  z.object({ action: z.literal("ice"), streamId: z.string(), sessionId: z.string(), candidat: z.any() }),
  z.object({ action: z.literal("parler"), streamId: z.string(), sessionId: z.string(), messageId: z.string() }),
  z.object({ action: z.literal("fermer"), streamId: z.string(), sessionId: z.string() }),
]);

export async function POST(req: Request) {
  try {
    if (process.env.DID_STREAMING !== "true") {
      return NextResponse.json({ erreur: "Mode temps réel désactivé (DID_STREAMING)." }, { status: 404 });
    }
    const fan = await exigerFan();
    const body = Schema.safeParse(await req.json().catch(() => null));
    if (!body.success) return NextResponse.json({ erreur: "Requête invalide." }, { status: 400 });
    const d = body.data;

    // Chaque session D-ID appartient au fan qui l'a créée
    if (d.action !== "creer" && (await kv.get(`stream-owner:${d.streamId}`)) !== fan.id) {
      throw new ErreurAcces(403, "Session vidéo inconnue.");
    }

    switch (d.action) {
      case "creer": {
        const session = await creerStream(fan.persona.avatarSourceUrl);
        await kv.set(`stream-owner:${session.id}`, fan.id, 60 * 60);
        return NextResponse.json(session);
      }
      case "sdp":
        return NextResponse.json((await envoyerReponseSdp(d.streamId, d.sessionId, d.answer)) ?? { ok: true });
      case "ice":
        return NextResponse.json((await envoyerIce(d.streamId, d.sessionId, d.candidat)) ?? { ok: true });
      case "parler": {
        const { texte, persona } = await messageCompagnonAutorise(d.messageId);
        return NextResponse.json((await parlerStream(d.streamId, d.sessionId, preparerTexteVocal(texte), persona.voiceId)) ?? { ok: true });
      }
      case "fermer":
        await kv.del(`stream-owner:${d.streamId}`);
        return NextResponse.json((await fermerStream(d.streamId, d.sessionId)) ?? { ok: true });
    }
  } catch (e) {
    return reponseErreur(e);
  }
}
