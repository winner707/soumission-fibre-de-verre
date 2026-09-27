import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import { DonneesActions } from "@/components/DonneesActions";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function PageMesDonnees() {
  const user = await utilisateurCourant();
  const fan = await prisma.fan.findUniqueOrThrow({ where: { userId: user!.id } });

  return (
    <main className="container max-w-3xl py-8">
      <Card>
        <CardHeader>
          <CardTitle>Mes données</CardTitle>
          <CardDescription>
            Tes conversations sont chiffrées. Les journaux de modération sont anonymisés. Tu peux exporter ou supprimer
            l&apos;ensemble de tes données à tout moment (RGPD).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DonneesActions fanId={fan.id} />
        </CardContent>
      </Card>
    </main>
  );
}
