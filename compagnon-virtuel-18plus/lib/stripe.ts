import Stripe from "stripe";

/** Client Stripe (vérification d'âge via Stripe Identity ; paiements en option). */
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY manquante.");
  client ??= new Stripe(process.env.STRIPE_SECRET_KEY);
  return client;
}
