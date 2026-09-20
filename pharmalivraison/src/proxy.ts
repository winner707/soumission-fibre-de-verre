import type { NextRequest } from "next/server";

import { rafraichirSession } from "@/lib/supabase/proxy";

/**
 * Remplace l'ancien `middleware.ts` (renomme `proxy.ts` depuis Next.js 16).
 *
 * Role actuel : renouveler la session Supabase a chaque requete. Le controle
 * d'acces par role (pharmacie / livreur) sera greffe ici a l'etape 7, une
 * fois la page de connexion en place.
 */
export async function proxy(request: NextRequest) {
  const { reponse } = await rafraichirSession(request);
  return reponse;
}

export const config = {
  matcher: [
    /*
     * Toutes les routes sauf les fichiers statiques et les images : sans
     * cette exclusion, le proxy s'executerait aussi sur le CSS et le JS.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
