import { hashCache } from "@/lib/crypto";
import { kv, cles } from "@/lib/redis";
import { syntheseBuffer } from "@/lib/elevenlabs";

/**
 * Wrapper D-ID (avatar vidéo parlant).
 * Flux « talks » (asynchrone) :
 *   1. Synthèse de la voix ElevenLabs (même voix que l'audio seul).
 *   2. Envoi de l'audio à D-ID (/audios) → URL hébergée.
 *   3. Création de la vidéo (/talks) avec lip-sync + expression émotionnelle.
 *   4. Polling (/talks/{id}) jusqu'à "done" → result_url (mp4).
 * Cache : hash(image + voix + texte + émotion) → talkId / result_url dans Redis.
 * En cas d'échec, l'interface bascule automatiquement sur l'audio seul.
 *
 * Le mode temps réel (WebRTC, /talks/streams) est exposé plus bas pour la route /api/avatar/stream.
 */

const API = "https://api.d-id.com";
const TTL_VIDEO = 60 * 60 * 12; // les URLs signées D-ID expirent : on garde 12 h

function entetes(json = true): HeadersInit {
  const cle = process.env.DID_API_KEY;
  if (!cle) throw new Error("DID_API_KEY manquante.");
  // D-ID fournit une clé au format "utilisateur:secret" utilisée telle quelle en Basic auth
  return { Authorization: `Basic ${cle}`, ...(json ? { "Content-Type": "application/json" } : {}), Accept: "application/json" };
}

async function did<T>(chemin: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${chemin}`, { ...init, headers: { ...entetes(!(init.body instanceof FormData)), ...init.headers } });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`D-ID ${res.status} : ${detail.slice(0, 300)}`);
  }
  return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
}

/** Expressions supportées par D-ID : neutral, happy, surprise, serious. */
export type Emotion = "neutral" | "happy" | "surprise" | "serious";

/**
 * Déduit une émotion simple du texte (heuristique légère, sans appel LLM).
 * Le « clin d'œil » n'existe pas côté D-ID : on le rend par "happy" à forte intensité.
 */
export function detecterEmotion(texte: string): { expression: Emotion; intensite: number } {
  const t = texte.toLowerCase();
  if (/😉|😘|clin d'?(œ|oe)il|coquin|taquin|hihi|haha/.test(t)) return { expression: "happy", intensite: 0.9 };
  if (/😮|😲|oh !|waouh|wow|vraiment \?|sérieux \?/.test(t)) return { expression: "surprise", intensite: 0.7 };
  if (/désolée?|je suis là|courage|triste|dur pour toi|prends soin/.test(t)) return { expression: "serious", intensite: 0.5 };
  return { expression: "happy", intensite: 0.5 };
}

export interface EtatVideo {
  talkId: string;
  statut: "created" | "started" | "done" | "error" | "rejected";
  resultUrl?: string;
  erreur?: string;
}

interface TalkD_ID {
  id: string;
  status: EtatVideo["statut"];
  result_url?: string;
  error?: { description?: string };
}

/** Envoie un mp3 à D-ID et renvoie son URL hébergée. */
async function televerserAudio(audio: Buffer): Promise<string> {
  const form = new FormData();
  form.append("audio", new Blob([new Uint8Array(audio)], { type: "audio/mpeg" }), "voix.mp3");
  const res = await did<{ url: string }>("/audios", { method: "POST", body: form });
  return res.url;
}

interface ParamsVideo {
  texte: string;
  sourceUrl?: string | null;
  voiceId?: string | null;
}

/** Lance (ou récupère depuis le cache) la génération d'une vidéo d'avatar. */
export async function creerVideo({ texte, sourceUrl, voiceId }: ParamsVideo): Promise<EtatVideo> {
  const source = sourceUrl || process.env.DID_DEFAULT_SOURCE_URL;
  if (!source) throw new Error("Aucune image d'avatar configurée (persona.avatarSourceUrl ou DID_DEFAULT_SOURCE_URL).");

  const emotion = detecterEmotion(texte);
  const hash = hashCache(source, voiceId ?? "", texte, emotion.expression);
  const enCache = await kv.getJSON<EtatVideo>(cles.video(hash));
  if (enCache && enCache.statut !== "error" && enCache.statut !== "rejected") return enCache;

  const audio = await syntheseBuffer(texte, voiceId);
  const audioUrl = await televerserAudio(audio);

  const talk = await did<TalkD_ID>("/talks", {
    method: "POST",
    body: JSON.stringify({
      source_url: source,
      script: { type: "audio", audio_url: audioUrl },
      config: {
        fluent: true,
        stitch: true,
        driver_expressions: {
          expressions: [{ start_frame: 0, expression: emotion.expression, intensity: emotion.intensite }],
        },
      },
    }),
  });

  const etat: EtatVideo = { talkId: talk.id, statut: talk.status ?? "created" };
  await kv.setJSON(cles.video(hash), etat, TTL_VIDEO);
  await kv.set(`video-hash:${talk.id}`, hash, TTL_VIDEO);
  return etat;
}

/** Interroge D-ID (polling) et met le cache à jour quand la vidéo est prête. */
export async function statutVideo(talkId: string): Promise<EtatVideo> {
  const talk = await did<TalkD_ID>(`/talks/${encodeURIComponent(talkId)}`);
  const etat: EtatVideo = {
    talkId,
    statut: talk.status,
    resultUrl: talk.result_url,
    erreur: talk.error?.description,
  };
  const hash = await kv.get(`video-hash:${talkId}`);
  if (hash) await kv.setJSON(cles.video(hash), etat, TTL_VIDEO);
  return etat;
}

/* ─── Temps réel (WebRTC via /talks/streams) ─────────────────────────────── */

export interface SessionStream {
  id: string;
  session_id: string;
  offer: RTCSessionDescriptionInit;
  ice_servers: RTCIceServer[];
}

export function creerStream(sourceUrl?: string | null) {
  const source = sourceUrl || process.env.DID_DEFAULT_SOURCE_URL;
  return did<SessionStream>("/talks/streams", { method: "POST", body: JSON.stringify({ source_url: source }) });
}

export function envoyerReponseSdp(streamId: string, sessionId: string, answer: RTCSessionDescriptionInit) {
  return did(`/talks/streams/${encodeURIComponent(streamId)}/sdp`, {
    method: "POST",
    body: JSON.stringify({ answer, session_id: sessionId }),
  });
}

export function envoyerIce(streamId: string, sessionId: string, candidat: RTCIceCandidateInit) {
  return did(`/talks/streams/${encodeURIComponent(streamId)}/ice`, {
    method: "POST",
    body: JSON.stringify({ ...candidat, session_id: sessionId }),
  });
}

/** Fait parler l'avatar en direct (texte lu via ElevenLabs côté D-ID). */
export function parlerStream(streamId: string, sessionId: string, texte: string, voiceId?: string | null) {
  return did(`/talks/streams/${encodeURIComponent(streamId)}`, {
    method: "POST",
    // D-ID appelle ElevenLabs avec notre clé, transmise via cet en-tête dédié
    headers: { "x-api-key-external": JSON.stringify({ elevenlabs: process.env.ELEVENLABS_API_KEY ?? "" }) },
    body: JSON.stringify({
      session_id: sessionId,
      script: {
        type: "text",
        input: texte,
        provider: { type: "elevenlabs", voice_id: voiceId || process.env.ELEVENLABS_VOICE_ID, model_id: "eleven_multilingual_v2" },
      },
      config: { fluent: true, stitch: true },
    }),
  });
}

export function fermerStream(streamId: string, sessionId: string) {
  return did(`/talks/streams/${encodeURIComponent(streamId)}`, {
    method: "DELETE",
    body: JSON.stringify({ session_id: sessionId }),
  });
}
