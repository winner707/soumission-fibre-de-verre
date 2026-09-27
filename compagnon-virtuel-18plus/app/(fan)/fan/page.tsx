import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import { ChatCompanion } from "@/components/ChatCompanion";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/** Espace fan : chat avec le compagnon (le layout a déjà vérifié âge et bannissement). */
export default async function PageFan() {
  const user = await utilisateurCourant();
  const fan = await prisma.fan.findUniqueOrThrow({ where: { userId: user!.id }, include: { persona: true } });

  if (!fan.consentementDonne) {
    return (
      <main className="container flex flex-col items-center gap-4 py-24 text-center">
        <h1 className="font-serif text-2xl">Consentement retiré</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Tu as retiré ton consentement : la conversation est en pause. Tu peux le redonner quand tu veux depuis tes préférences.
        </p>
        <Button asChild><Link href="/fan/preferences">Mes préférences</Link></Button>
      </main>
    );
  }

  if (!fan.persona.actif) {
    return <p className="py-24 text-center text-muted-foreground">{fan.persona.nom} n&apos;est pas disponible pour le moment.</p>;
  }

  return (
    <ChatCompanion
      nomPersona={fan.persona.nom}
      safeWord={fan.safeWord}
      modeLive={process.env.DID_STREAMING === "true"}
      portrait={fan.persona.avatarSourceUrl ?? process.env.DID_DEFAULT_SOURCE_URL}
    />
  );
}
