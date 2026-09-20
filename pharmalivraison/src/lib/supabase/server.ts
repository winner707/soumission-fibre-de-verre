import "server-only";

import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Client Supabase pour les composants serveur, les Server Actions et les
 * Route Handlers. Il faut en creer un nouveau a chaque requete : ne jamais
 * conserver l'instance dans une variable de module.
 */
export async function creerClientServeur() {
  const { url, key } = requirePublicSupabaseEnv();
  const magasinCookies = await cookies();

  return createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return magasinCookies.getAll();
      },
      setAll(cookiesAEcrire) {
        try {
          for (const { name, value, options } of cookiesAEcrire) {
            magasinCookies.set(name, value, options);
          }
        } catch {
          // Appele depuis un composant serveur : l'ecriture de cookies y est
          // interdite. Le rafraichissement de session est alors assure par
          // `src/proxy.ts`, ce qui rend cette erreur sans consequence.
        }
      },
    },
  });
}
