import Redis from "ioredis";
import { chiffrer, dechiffrer } from "@/lib/crypto";

/**
 * Petit magasin clé/valeur au-dessus de Redis.
 * - Les valeurs JSON sont chiffrées (elles peuvent contenir des extraits de conversation).
 * - Si REDIS_URL est absent (dev), repli sur une Map en mémoire, non partagée entre instances.
 */
export interface Kv {
  getJSON<T>(cle: string): Promise<T | null>;
  setJSON(cle: string, valeur: unknown, ttlSecondes?: number): Promise<void>;
  get(cle: string): Promise<string | null>;
  set(cle: string, valeur: string, ttlSecondes?: number): Promise<void>;
  incr(cle: string, ttlSecondes: number): Promise<number>;
  del(...cles: string[]): Promise<void>;
}

class RedisKv implements Kv {
  constructor(private r: Redis) {}
  async getJSON<T>(cle: string) {
    const v = await this.r.get(cle);
    return v ? (JSON.parse(dechiffrer(v)) as T) : null;
  }
  async setJSON(cle: string, valeur: unknown, ttl?: number) {
    await this.set(cle, chiffrer(JSON.stringify(valeur)), ttl);
  }
  get(cle: string) {
    return this.r.get(cle);
  }
  async set(cle: string, valeur: string, ttl?: number) {
    if (ttl) await this.r.set(cle, valeur, "EX", ttl);
    else await this.r.set(cle, valeur);
  }
  async incr(cle: string, ttl: number) {
    const n = await this.r.incr(cle);
    if (n === 1) await this.r.expire(cle, ttl);
    return n;
  }
  async del(...cles: string[]) {
    if (cles.length) await this.r.del(...cles);
  }
}

class MemoireKv implements Kv {
  private m = new Map<string, { v: string; exp?: number }>();
  private lire(cle: string) {
    const e = this.m.get(cle);
    if (!e) return null;
    if (e.exp && e.exp < Date.now()) {
      this.m.delete(cle);
      return null;
    }
    return e.v;
  }
  async getJSON<T>(cle: string) {
    const v = this.lire(cle);
    return v ? (JSON.parse(v) as T) : null;
  }
  async setJSON(cle: string, valeur: unknown, ttl?: number) {
    await this.set(cle, JSON.stringify(valeur), ttl);
  }
  async get(cle: string) {
    return this.lire(cle);
  }
  async set(cle: string, valeur: string, ttl?: number) {
    this.m.set(cle, { v: valeur, exp: ttl ? Date.now() + ttl * 1000 : undefined });
  }
  async incr(cle: string, ttl: number) {
    const n = Number(this.lire(cle) ?? 0) + 1;
    const exp = this.m.get(cle)?.exp;
    this.m.set(cle, { v: String(n), exp: exp ?? Date.now() + ttl * 1000 });
    return n;
  }
  async del(...cles: string[]) {
    cles.forEach((c) => this.m.delete(c));
  }
}

const globalForKv = globalThis as unknown as { kv?: Kv };

function creerKv(): Kv {
  if (process.env.REDIS_URL) {
    return new RedisKv(new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 2, lazyConnect: false }));
  }
  if (process.env.NODE_ENV === "production") {
    console.warn("[kv] REDIS_URL absent en production : mémoire locale utilisée (non recommandé).");
  }
  return new MemoireKv();
}

export const kv: Kv = globalForKv.kv ?? creerKv();
globalForKv.kv = kv;

/** Préfixes de clés centralisés (utile pour le droit à l'oubli). */
export const cles = {
  historique: (fanId: string) => `hist:${fanId}`,
  faits: (fanId: string) => `faits:${fanId}`,
  stop: (fanId: string) => `stop:${fanId}`,
  debit: (fanId: string) => `debit:${fanId}`,
  compteur: (fanId: string) => `compteur:${fanId}`,
  video: (hash: string) => `video:${hash}`,
  toutesPourFan: (fanId: string) => [`hist:${fanId}`, `faits:${fanId}`, `stop:${fanId}`, `debit:${fanId}`, `compteur:${fanId}`],
};
