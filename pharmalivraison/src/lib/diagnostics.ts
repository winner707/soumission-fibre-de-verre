import "server-only";

import {
  SUPABASE_PUBLIC_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
} from "@/lib/env";

export type EtatVerification = "ok" | "echec" | "ignore";

export type Verification = {
  nom: string;
  etat: EtatVerification;
  detail: string;
};

const DELAI_MS = 5000;

async function interroger(chemin: string, cle: string) {
  const reponse = await fetch(`${SUPABASE_URL}${chemin}`, {
    headers: { apikey: cle, Authorization: `Bearer ${cle}` },
    cache: "no-store",
    signal: AbortSignal.timeout(DELAI_MS),
  });
  return reponse;
}

function messageErreur(erreur: unknown) {
  if (erreur instanceof Error) {
    return erreur.name === "TimeoutError"
      ? `Aucune reponse en moins de ${DELAI_MS / 1000} s.`
      : erreur.message;
  }
  return String(erreur);
}

/**
 * Verifie que les trois services Supabase utilises par l'application
 * repondent : authentification, base de donnees et stockage.
 *
 * Utilise pour la page de diagnostic ; ces appels ne remplacent pas les
 * tests, ils confirment seulement que la configuration pointe vers un projet
 * joignable.
 */
export async function verifierSupabase(): Promise<Verification[]> {
  if (!SUPABASE_URL || !SUPABASE_PUBLIC_KEY) {
    const detail =
      "Variables NEXT_PUBLIC_SUPABASE_URL et/ou NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY absentes.";
    return [
      { nom: "Authentification", etat: "ignore", detail },
      { nom: "Base de donnees", etat: "ignore", detail },
      { nom: "Stockage", etat: "ignore", detail },
    ];
  }

  const verifications: Verification[] = [];

  try {
    const reponse = await interroger("/auth/v1/health", SUPABASE_PUBLIC_KEY);
    verifications.push({
      nom: "Authentification",
      etat: reponse.ok ? "ok" : "echec",
      detail: reponse.ok
        ? "Le service d'authentification repond."
        : `Reponse HTTP ${reponse.status}.`,
    });
  } catch (erreur) {
    verifications.push({
      nom: "Authentification",
      etat: "echec",
      detail: messageErreur(erreur),
    });
  }

  try {
    const reponse = await interroger("/rest/v1/", SUPABASE_PUBLIC_KEY);
    verifications.push({
      nom: "Base de donnees",
      etat: reponse.ok ? "ok" : "echec",
      detail: reponse.ok
        ? "L'API REST PostgREST repond. Le schema sera cree a l'etape 2."
        : `Reponse HTTP ${reponse.status}.`,
    });
  } catch (erreur) {
    verifications.push({
      nom: "Base de donnees",
      etat: "echec",
      detail: messageErreur(erreur),
    });
  }

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    verifications.push({
      nom: "Stockage",
      etat: "ignore",
      detail:
        "SUPABASE_SERVICE_ROLE_KEY absente : impossible de lister les buckets.",
    });
    return verifications;
  }

  try {
    const reponse = await interroger("/storage/v1/bucket", SUPABASE_SERVICE_ROLE_KEY);
    if (!reponse.ok) {
      verifications.push({
        nom: "Stockage",
        etat: "echec",
        detail: `Reponse HTTP ${reponse.status}.`,
      });
    } else {
      const buckets = (await reponse.json()) as Array<{ name: string }>;
      verifications.push({
        nom: "Stockage",
        etat: "ok",
        detail:
          buckets.length > 0
            ? `Buckets existants : ${buckets.map((b) => b.name).join(", ")}.`
            : "Aucun bucket pour l'instant ; il sera cree a l'etape 2.",
      });
    }
  } catch (erreur) {
    verifications.push({
      nom: "Stockage",
      etat: "echec",
      detail: messageErreur(erreur),
    });
  }

  return verifications;
}
