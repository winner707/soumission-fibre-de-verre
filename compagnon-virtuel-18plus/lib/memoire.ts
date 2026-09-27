import { cles, kv } from "@/lib/redis";
import type { MessageHistorique } from "@/lib/claude";
import type { FaitsFan } from "@/lib/prompts";

/**
 * Mémoire du compagnon, stockée chiffrée dans Redis :
 * - historique court (derniers échanges envoyés au modèle)
 * - faits mémorisés (prénom, anniversaire, goûts, sujets abordés)
 */
const TAILLE_HISTORIQUE = 20; // messages (10 échanges)
const TTL_HISTORIQUE = 60 * 60 * 24 * 30; // 30 jours
const TTL_FAITS = 60 * 60 * 24 * 365;

export async function lireHistorique(fanId: string): Promise<MessageHistorique[]> {
  return (await kv.getJSON<MessageHistorique[]>(cles.historique(fanId))) ?? [];
}

export async function ajouterEchange(fanId: string, ...messages: MessageHistorique[]): Promise<MessageHistorique[]> {
  const hist = [...(await lireHistorique(fanId)), ...messages].slice(-TAILLE_HISTORIQUE);
  await kv.setJSON(cles.historique(fanId), hist, TTL_HISTORIQUE);
  return hist;
}

/** Efface le contexte récent (demandé après un safe word ou via le bouton Stop). */
export async function effacerContexteRecent(fanId: string): Promise<void> {
  await kv.del(cles.historique(fanId));
}

export async function lireFaits(fanId: string): Promise<FaitsFan> {
  return (await kv.getJSON<FaitsFan>(cles.faits(fanId))) ?? {};
}

export async function ecrireFaits(fanId: string, faits: FaitsFan): Promise<void> {
  await kv.setJSON(cles.faits(fanId), faits, TTL_FAITS);
}

/** Droit à l'oubli : purge toutes les clés Redis du fan. */
export async function purgerMemoire(fanId: string): Promise<void> {
  await kv.del(...cles.toutesPourFan(fanId));
}
