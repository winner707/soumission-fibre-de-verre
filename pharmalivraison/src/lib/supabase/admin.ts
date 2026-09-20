import "server-only";

import { createClient } from "@supabase/supabase-js";

import { requirePublicSupabaseEnv, requireServiceRoleKey } from "@/lib/env";
import type { Database } from "./types";

/**
 * Client d'administration : il utilise la cle de service et contourne donc
 * les politiques RLS.
 *
 * Reserve aux traitements qui ne peuvent pas passer par la session de
 * l'utilisateur : ecriture du journal d'audit, webhooks Twilio, taches
 * planifiees. Ne jamais l'exposer a une route accessible sans controle
 * d'acces explicite.
 */
export function creerClientAdmin() {
  const { url } = requirePublicSupabaseEnv();

  return createClient<Database>(url, requireServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
