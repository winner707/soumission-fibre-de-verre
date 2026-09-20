/**
 * Lecture et validation centralisee des variables d'environnement.
 *
 * Les references a `process.env.*` sont ecrites litteralement : Next.js
 * remplace les variables `NEXT_PUBLIC_*` au moment du build, ce qui n'est
 * possible que si l'acces est statique (pas de `process.env[nom]`).
 */

/** URL du projet Supabase, exposee au navigateur. */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Cle publique du projet. Supabase nomme desormais cette cle
 * « publishable key » ; les projets plus anciens utilisent « anon key ».
 * Les deux noms sont acceptes.
 */
export const SUPABASE_PUBLIC_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * Cle de service. Elle contourne les politiques RLS : elle ne doit jamais
 * etre importee depuis un composant client ni prefixee `NEXT_PUBLIC_`.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

/** URL publique du site, utilisee pour les redirections d'authentification. */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Vrai si les variables necessaires au client navigateur sont presentes. */
export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_PUBLIC_KEY);

/**
 * Renvoie l'URL et la cle publique, ou leve une erreur explicite si la
 * configuration est incomplete.
 */
export function requirePublicSupabaseEnv() {
  const manquantes: string[] = [];
  if (!SUPABASE_URL) manquantes.push("NEXT_PUBLIC_SUPABASE_URL");
  if (!SUPABASE_PUBLIC_KEY) manquantes.push("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");

  if (manquantes.length > 0) {
    throw new Error(
      `Configuration Supabase incomplete. Variables manquantes : ${manquantes.join(
        ", ",
      )}. Copiez .env.example vers .env.local et renseignez-les.`,
    );
  }

  return { url: SUPABASE_URL, key: SUPABASE_PUBLIC_KEY };
}

/** Idem pour la cle de service, reservee au code serveur. */
export function requireServiceRoleKey() {
  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY est absente. Cette cle est requise pour les " +
        "operations d'administration cote serveur.",
    );
  }
  return SUPABASE_SERVICE_ROLE_KEY;
}
