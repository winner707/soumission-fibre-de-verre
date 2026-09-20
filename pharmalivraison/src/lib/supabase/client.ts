"use client";

import { createBrowserClient } from "@supabase/ssr";

import { requirePublicSupabaseEnv } from "@/lib/env";
import type { Database } from "./types";

/**
 * Client Supabase pour les composants client.
 *
 * `createBrowserClient` renvoie un singleton par onglet : on peut l'appeler
 * dans plusieurs composants sans multiplier les connexions temps reel.
 */
export function creerClientNavigateur() {
  const { url, key } = requirePublicSupabaseEnv();
  return createBrowserClient<Database>(url, key);
}
