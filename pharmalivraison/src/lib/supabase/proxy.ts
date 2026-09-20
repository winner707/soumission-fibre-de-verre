import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Rafraichit la session Supabase a chaque requete et renvoie la reponse
 * portant les cookies mis a jour.
 *
 * Les composants serveur ne peuvent pas ecrire de cookies : sans ce passage,
 * les jetons expires ne seraient jamais renouveles et les utilisateurs
 * seraient deconnectes au hasard.
 */
export async function rafraichirSession(request: NextRequest) {
  // Sans configuration Supabase, l'application doit rester consultable
  // (page d'accueil, diagnostic) plutot que renvoyer une erreur 500.
  if (!isSupabaseConfigured) {
    return { reponse: NextResponse.next({ request }), utilisateur: null };
  }

  let reponse = NextResponse.next({ request });
  const { url, key } = requirePublicSupabaseEnv();

  const supabase = createServerClient<Database>(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesAEcrire) {
        for (const { name, value } of cookiesAEcrire) {
          request.cookies.set(name, value);
        }
        reponse = NextResponse.next({ request });
        for (const { name, value, options } of cookiesAEcrire) {
          reponse.cookies.set(name, value, options);
        }
      },
    },
  });

  // `getUser()` valide le jeton aupres de Supabase, contrairement a
  // `getSession()` qui se contente de lire le cookie. Ne pas le remplacer :
  // c'est ce qui declenche le rafraichissement et la reecriture des cookies.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { reponse, utilisateur: user };
}
