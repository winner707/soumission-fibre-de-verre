import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { dechiffrer } from "@/lib/crypto";
import { exigerCreateur } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FanActions } from "@/components/createur/FanActions";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

/** Conversation d'un fan (déchiffrée côté serveur) + actions de modération. */
export default async function PageFan({ params }: { params: { fanId: string } }) {
  const { persona } = await exigerCreateur();
  const fan = await prisma.fan.findFirst({ where: { id: params.fanId, personaId: persona?.id ?? "" } });
  if (!fan) notFound();

  const messages = await prisma.message.findMany({ where: { fanId: fan.id }, orderBy: { createdAt: "asc" }, take: 500 });

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-3xl">{fan.pseudo}</h1>
        <Badge variant="outline" className="capitalize">{fan.ton}</Badge>
        {fan.banni && <Badge variant="destructive">Banni</Badge>}
      </div>
      <FanActions fanId={fan.id} banni={fan.banni} />

      <Card>
        <CardHeader>
          <CardTitle>Préférences déclarées</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-muted-foreground">
          <p>Sujets aimés : {fan.sujetsAimes.join(", ") || "—"}</p>
          <p>Sujets tabous : {fan.sujetsTabous.join(", ") || "—"}</p>
          <p>Consentement : {fan.consentementDonne ? "actif" : "retiré"}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {messages.length === 0 && <p className="text-sm text-muted-foreground">Aucun message.</p>}
          {messages.map((m) => (
            <div key={m.id} className={cn("flex flex-col gap-1", m.auteur === "fan" ? "items-end" : "items-start")}>
              <div className={m.auteur === "fan" ? "bulle-fan" : "bulle-compagnon"}>
                <p className="whitespace-pre-wrap text-sm">{dechiffrer(m.contenuChiffre)}</p>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                {m.createdAt.toLocaleString("fr-FR")}
                {m.verdict !== "ok" && <Badge variant={m.verdict === "interdit" ? "destructive" : "or"}>{m.verdict}</Badge>}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
