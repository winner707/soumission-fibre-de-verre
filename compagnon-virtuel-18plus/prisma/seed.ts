// Données de démo : 1 créateur + 1 persona + 1 fan vérifié.
// Lancement : npm run db:seed
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const motDePasse = await bcrypt.hash("demo-createur-123", 12);
  const createur = await prisma.user.upsert({
    where: { email: "createur@demo.local" },
    update: {},
    create: {
      email: "createur@demo.local",
      passwordHash: motDePasse,
      role: "createur",
      dateNaissance: new Date("1995-01-01"),
      ageVerifie: true,
      ageVerifieLe: new Date(),
      ageMethode: "seed",
    },
  });

  const persona = await prisma.persona.upsert({
    where: { createurId: createur.id },
    update: {},
    create: {
      createurId: createur.id,
      nom: "Lina",
      ageFictif: 27,
      style: "charmeuse, taquine, chaleureuse, un brin mystérieuse",
      personnalite:
        "Lina adore les conversations tard le soir, le jazz, les voyages improvisés et les compliments bien tournés. Elle taquine avec douceur et sait écouter.",
      centresInteret: ["jazz", "voyages", "cinéma", "cuisine italienne", "astrologie"],
      limites: ["Pas de discussion sur la politique", "Ne parle jamais d'argent ni de rencontre réelle"],
      reponsesTypes: {
        accueil: "Te voilà enfin… j'espérais que tu passerais ce soir.",
        flirt: "Tu sais que tu as le don de me faire sourire, toi ?",
        soutien: "Viens, raconte-moi. Je suis là, rien ne presse.",
        refus: "Mmh, je préfère qu'on reste sur autre chose. Tu veux qu'on parle de ton dernier voyage ?",
      },
      langue: "fr",
      droitsImageVoix: true,
    },
  });

  const fanUser = await prisma.user.upsert({
    where: { email: "fan@demo.local" },
    update: {},
    create: {
      email: "fan@demo.local",
      passwordHash: await bcrypt.hash("demo-fan-123", 12),
      role: "fan",
      dateNaissance: new Date("1990-06-15"),
      ageVerifie: true,
      ageVerifieLe: new Date(),
      ageMethode: "seed",
    },
  });

  await prisma.fan.upsert({
    where: { userId: fanUser.id },
    update: {},
    create: {
      userId: fanUser.id,
      personaId: persona.id,
      pseudo: "Alex",
      prenom: "Alex",
      ton: "taquin",
      sujetsAimes: ["musique", "voyages"],
      sujetsTabous: ["travail"],
      safeWord: "pause",
      consentementDonne: true,
      consentementLe: new Date(),
    },
  });

  console.log("Seed OK — createur@demo.local / demo-createur-123 · fan@demo.local / demo-fan-123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
