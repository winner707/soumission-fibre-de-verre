import { NextResponse, type NextRequest } from "next/server";

import { creerClientServeur } from "@/lib/supabase/server";

/**
 * Point de retour de l'authentification Supabase (lien magique, invitation,
 * reinitialisation de mot de passe, OAuth).
 *
 * Supabase renvoie l'utilisateur ici avec un parametre `code` qu'il faut
 * echanger contre une session ; les cookies sont ecrits par le client
 * serveur au passage.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // `next` permet de revenir a la page demandee avant la connexion. On
  // n'accepte qu'un chemin relatif, pour eviter une redirection ouverte.
  const suite = searchParams.get("next");
  const destination = suite?.startsWith("/") && !suite.startsWith("//") ? suite : "/";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/auth/erreur?motif=${encodeURIComponent("Code d'authentification absent.")}`,
    );
  }

  const supabase = await creerClientServeur();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/erreur?motif=${encodeURIComponent(error.message)}`,
    );
  }

  return NextResponse.redirect(`${origin}${destination}`);
}
