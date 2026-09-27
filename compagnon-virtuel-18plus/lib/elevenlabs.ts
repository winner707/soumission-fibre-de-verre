import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { hashCache } from "@/lib/crypto";

/**
 * Wrapper ElevenLabs Text-to-Speech.
 * - Modèle eleven_multilingual_v2 (FR/EN), réglages imposés par le cahier des charges.
 * - Streaming : l'audio est renvoyé au navigateur au fur et à mesure.
 * - Cache disque : sha256(voix + modèle + réglages + texte) → .cache/tts/<hash>.mp3
 */

const API = "https://api.elevenlabs.io/v1";
export const MODELE_TTS = "eleven_multilingual_v2";
export const REGLAGES_VOIX = {
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3,
  use_speaker_boost: true,
} as const;

const DOSSIER_CACHE = path.join(process.cwd(), ".cache", "tts");

function cheminCache(texte: string, voiceId: string) {
  const hash = hashCache(voiceId, MODELE_TTS, JSON.stringify(REGLAGES_VOIX), texte);
  return path.join(DOSSIER_CACHE, `${hash}.mp3`);
}

function voixParDefaut(voiceId?: string | null): string {
  const v = voiceId || process.env.ELEVENLABS_VOICE_ID;
  if (!v) throw new Error("Aucune voix configurée (persona.voiceId ou ELEVENLABS_VOICE_ID).");
  return v;
}

async function appelerTTS(texte: string, voiceId: string): Promise<Response> {
  const cle = process.env.ELEVENLABS_API_KEY;
  if (!cle) throw new Error("ELEVENLABS_API_KEY manquante.");
  const res = await fetch(`${API}/text-to-speech/${encodeURIComponent(voiceId)}/stream?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": cle, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: texte, model_id: MODELE_TTS, voice_settings: REGLAGES_VOIX }),
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`ElevenLabs ${res.status} : ${detail.slice(0, 200)}`);
  }
  return res;
}

/**
 * Renvoie un flux audio/mpeg. Sert depuis le cache si possible,
 * sinon diffuse la réponse ElevenLabs tout en l'écrivant sur disque.
 */
export async function syntheseStream(
  texte: string,
  voiceId?: string | null,
): Promise<{ flux: ReadableStream<Uint8Array>; depuisCache: boolean }> {
  const voix = voixParDefaut(voiceId);
  const fichier = cheminCache(texte, voix);

  if (fs.existsSync(fichier)) {
    return { flux: Readable.toWeb(fs.createReadStream(fichier)) as ReadableStream<Uint8Array>, depuisCache: true };
  }

  const res = await appelerTTS(texte, voix);
  const [pourClient, pourCache] = res.body!.tee();

  // Écriture du cache en arrière-plan (fichier temporaire puis renommage atomique)
  void (async () => {
    try {
      await fsp.mkdir(DOSSIER_CACHE, { recursive: true });
      const tmp = `${fichier}.${process.pid}.tmp`;
      const morceaux: Uint8Array[] = [];
      const reader = pourCache.getReader();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        morceaux.push(value);
      }
      await fsp.writeFile(tmp, Buffer.concat(morceaux));
      await fsp.rename(tmp, fichier);
    } catch (e) {
      console.error("[elevenlabs] écriture du cache impossible :", (e as Error).message);
    }
  })();

  return { flux: pourClient, depuisCache: false };
}

/** Version tampon (utile pour envoyer l'audio à D-ID). Utilise le même cache. */
export async function syntheseBuffer(texte: string, voiceId?: string | null): Promise<Buffer> {
  const voix = voixParDefaut(voiceId);
  const fichier = cheminCache(texte, voix);
  if (fs.existsSync(fichier)) return fsp.readFile(fichier);
  const res = await appelerTTS(texte, voix);
  const buf = Buffer.from(await res.arrayBuffer());
  await fsp.mkdir(DOSSIER_CACHE, { recursive: true });
  await fsp.writeFile(fichier, buf).catch(() => undefined);
  return buf;
}

/** Nettoie le texte avant synthèse (emojis et astérisques ne se prononcent pas bien). */
export function preparerTexteVocal(texte: string): string {
  return texte
    .replace(/\*[^*]+\*/g, "")
    .replace(/\p{Extended_Pictographic}/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2500);
}
