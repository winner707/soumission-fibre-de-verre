import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
import { calculerAge } from "@/lib/utils";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Webhook Stripe Identity : marque l'utilisateur comme vérifié 18+ si la date de naissance
 * lue sur la pièce d'identité donne 18 ans ou plus. Seule l'information « majeur / vérifié »
 * est conservée — jamais la pièce d'identité elle-même.
 */
export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return NextResponse.json({ erreur: "Signature manquante." }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(await req.text(), signature, secret);
  } catch {
    return NextResponse.json({ erreur: "Signature invalide." }, { status: 400 });
  }

  if (event.type === "identity.verification_session.verified") {
    const vs = await stripe().identity.verificationSessions.retrieve(event.data.object.id, {
      expand: ["verified_outputs.dob"],
    });
    const dob = vs.verified_outputs?.dob;
    const userId = vs.metadata?.userId;
    if (userId && dob?.year && dob.month && dob.day) {
      const majeur = calculerAge(new Date(dob.year, dob.month - 1, dob.day)) >= 18;
      await prisma.user.update({
        where: { id: userId },
        data: majeur
          ? { ageVerifie: true, ageVerifieLe: new Date(), ageMethode: "stripe-identity" }
          : { ageVerifie: false, ageMethode: "stripe-identity-mineur" },
      });
    }
  }
  return NextResponse.json({ recu: true });
}
