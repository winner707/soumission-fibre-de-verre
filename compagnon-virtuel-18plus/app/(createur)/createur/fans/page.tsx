import { prisma } from "@/lib/prisma";
import { exigerCreateur } from "@/lib/session";
import { FanTable } from "@/components/createur/FanTable";

export const dynamic = "force-dynamic";

export default async function PageFans() {
  const { persona } = await exigerCreateur();
  if (!persona) return <p className="text-muted-foreground">Créez d&apos;abord votre persona.</p>;

  const [fans, signalements] = await Promise.all([
    prisma.fan.findMany({
      where: { personaId: persona.id },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { messages: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
      },
    }),
    prisma.message.groupBy({
      by: ["fanId"],
      where: { fan: { personaId: persona.id }, verdict: { in: ["limite", "interdit"] } },
      _count: true,
    }),
  ]);
  const parFan = new Map(signalements.map((s) => [s.fanId, s._count]));

  return (
    <div className="space-y-4">
      <h1 className="font-serif text-3xl">Fans</h1>
      <FanTable
        fans={fans.map((f) => ({
          id: f.id,
          pseudo: f.pseudo,
          ton: f.ton,
          banni: f.banni,
          consentementDonne: f.consentementDonne,
          messages: f._count.messages,
          signalements: parFan.get(f.id) ?? 0,
          dernierMessage: f.messages[0]?.createdAt.toISOString() ?? null,
        }))}
      />
    </div>
  );
}
