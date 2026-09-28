import { cles, kv } from "@/lib/redis";

/**
 * Registre des générations en cours, pour le bouton Stop et le safe word.
 * - En local (même processus) : AbortController → coupure immédiate.
 * - Multi-instances : drapeau Redis `stop:{fanId}` lu régulièrement par la route de chat.
 */
const globalForRegistre = globalThis as unknown as { generations?: Map<string, AbortController> };
const generations = globalForRegistre.generations ?? new Map<string, AbortController>();
globalForRegistre.generations = generations;

export function demarrerGeneration(fanId: string): AbortController {
  generations.get(fanId)?.abort();
  const ctrl = new AbortController();
  generations.set(fanId, ctrl);
  return ctrl;
}

export function terminerGeneration(fanId: string, ctrl: AbortController) {
  if (generations.get(fanId) === ctrl) generations.delete(fanId);
}

export async function arreterGeneration(fanId: string): Promise<void> {
  generations.get(fanId)?.abort();
  generations.delete(fanId);
  await kv.set(cles.stop(fanId), "1", 30);
}

export async function stopDemande(fanId: string): Promise<boolean> {
  return (await kv.get(cles.stop(fanId))) === "1";
}

export async function reinitialiserStop(fanId: string): Promise<void> {
  await kv.del(cles.stop(fanId));
}
