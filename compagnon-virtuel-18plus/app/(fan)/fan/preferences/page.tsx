import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import { lireFaits } from "@/lib/memoire";
import { PreferencePanel } from "@/components/PreferencePanel";
import { ConsentementToggle } from "@/components/ConsentementToggle";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TonFan } from "@/lib/limites";

export const dynamic = "force-dynamic";

export default async function PagePreferences() {
  const user = await utilisateurCourant();
  const fan = await prisma.fan.findUniqueOrThrow({ where: { userId: user!.id }, include: { persona: true } });
  const memoire = await lireFaits(fan.id);
  const souvenirs = [
    memoire.prenom && `Prénom : ${memoire.prenom}`,
    memoire.anniversaire && `Anniversaire : ${memoire.anniversaire}`,
    ...(memoire.gouts ?? []).map((g) => `Aime : ${g}`),
    ...(memoire.sujetsAbordes ?? []).map((s) => `Sujet : ${s}`),
  ].filter(Boolean) as string[];

  return (
    <main className="container max-w-3xl space-y-6 py-8">
      <Card>
        <CardHeader>
          <CardTitle>Consentement</CardTitle>
        </CardHeader>
        <CardContent>
          <ConsentementToggle fanId={fan.id} initial={fan.consentementDonne} />
        </CardContent>
      </Card>

      <PreferencePanel
        fanId={fan.id}
        initial={{
          prenom: fan.prenom,
          anniversaire: fan.anniversaire,
          ton: fan.ton as TonFan,
          sujetsAimes: fan.sujetsAimes,
          sujetsTabous: fan.sujetsTabous,
          safeWord: fan.safeWord,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Ce dont {fan.persona.nom} se souvient</CardTitle>
          <CardDescription>Mémoire chiffrée, utilisée uniquement pour personnaliser vos échanges. Effaçable depuis « Mes données ».</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {souvenirs.length ? souvenirs.map((s) => <Badge key={s} variant="or">{s}</Badge>) : <p className="text-sm text-muted-foreground">Rien pour l&apos;instant.</p>}
        </CardContent>
      </Card>
    </main>
  );
}
