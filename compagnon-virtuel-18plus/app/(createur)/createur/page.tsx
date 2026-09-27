import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { exigerCreateur } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ModerationTester } from "@/components/createur/ModerationTester";

export const dynamic = "force-dynamic";

export default async function TableauDeBord() {
  const createur = await exigerCreateur();
  const persona = createur.persona;
  const depuis = new Date(Date.now() - 7 * 24 * 3600 * 1000);

  const [nbFans, nbBannis, nbMessages, moderation] = persona
    ? await Promise.all([
        prisma.fan.count({ where: { personaId: persona.id } }),
        prisma.fan.count({ where: { personaId: persona.id, banni: true } }),
        prisma.message.count({ where: { fan: { personaId: persona.id }, createdAt: { gte: depuis } } }),
        prisma.moderationLog.groupBy({ by: ["verdict"], where: { createdAt: { gte: depuis } }, _count: true }),
      ])
    : [0, 0, 0, []];

  const stat = (v: string) => moderation.find((m) => m.verdict === v)?._count ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl">Bonsoir ✨</h1>
        {persona ? (
          <Badge variant={persona.actif ? "or" : "secondary"}>{persona.nom} · {persona.actif ? "en ligne" : "hors ligne"}</Badge>
        ) : (
          <Button asChild size="sm"><Link href="/createur/persona">Créer mon persona</Link></Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Fans", nbFans],
          ["Messages (7 j)", nbMessages],
          ["Signalements « limite » (7 j)", stat("limite")],
          ["Blocages « interdit » (7 j)", stat("interdit")],
        ].map(([titre, valeur]) => (
          <Card key={titre as string}>
            <CardHeader className="pb-2"><CardDescription>{titre}</CardDescription></CardHeader>
            <CardContent><p className="font-serif text-3xl">{valeur}</p></CardContent>
          </Card>
        ))}
      </div>
      {nbBannis > 0 && <p className="text-xs text-muted-foreground">{nbBannis} fan(s) banni(s).</p>}

      <Card>
        <CardHeader>
          <CardTitle>Tester la modération</CardTitle>
          <CardDescription>Filtre mots-clés + classification IA, avec vos limites personnalisées.</CardDescription>
        </CardHeader>
        <CardContent><ModerationTester /></CardContent>
      </Card>
    </div>
  );
}
