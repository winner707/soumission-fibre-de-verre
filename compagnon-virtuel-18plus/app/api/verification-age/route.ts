import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calculerAge } from "@/lib/utils";
import { ErreurAcces, reponseErreur, utilisateurCourant } from "@/lib/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/verification-age
 * - Mode "stripe" : crée une session Stripe Identity (pièce d'identité + selfie) et renvoie son URL.
 *   Le résultat arrive par webhook (/api/verification-age/webhook).
 * - Mode "dev" : simulation locale basée sur la date de naissance déclarée. INTERDIT en production.
 */
export async function POST() {
  try {
    const user = await utilisateurCourant();
    if (!user) throw new ErreurAcces(401, "Non connecté.");
    if (user.ageVerifie) return NextResponse.json({ ageVerifie: true });

    const mode = process.env.AGE_VERIFICATION_MODE ?? "dev";

    if (mode === "dev") {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json({ erreur: "La simulation de vérification est désactivée en production." }, { status: 400 });
      }
      // Après une déclaration de minorité, la simple date de naissance ne suffit plus
      if (user.ageMethode?.startsWith("suspendu")) {
        return NextResponse.json(
          { erreur: "Une vérification par pièce d'identité est requise (mode Stripe Identity)." },
          { status: 403 },
        );
      }
      if (calculerAge(user.dateNaissance) < 18) {
        return NextResponse.json({ erreur: "Accès refusé : réservé aux 18 ans et plus." }, { status: 403 });
      }
      await prisma.user.update({
        where: { id: user.id },
        data: { ageVerifie: true, ageVerifieLe: new Date(), ageMethode: "dev-simulation" },
      });
      return NextResponse.json({ ageVerifie: true, simulation: true });
    }

    const session = await stripe().identity.verificationSessions.create({
      type: "document",
      options: { document: { require_matching_selfie: true, require_live_capture: true } },
      metadata: { userId: user.id },
      return_url: `${process.env.NEXTAUTH_URL}/verification-age?retour=1`,
    });
    await prisma.user.update({ where: { id: user.id }, data: { ageSessionId: session.id } });
    return NextResponse.json({ url: session.url });
  } catch (e) {
    return reponseErreur(e);
  }
}
