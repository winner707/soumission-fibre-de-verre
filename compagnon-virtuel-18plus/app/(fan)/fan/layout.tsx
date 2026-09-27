import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { utilisateurCourant } from "@/lib/session";
import { Deconnexion } from "@/components/Deconnexion";

export const dynamic = "force-dynamic";

/** Garde de l'espace fan : connecté + âge vérifié + non banni (relu en base à chaque requête). */
export default async function LayoutFan({ children }: { children: React.ReactNode }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion?callbackUrl=/fan");
  if (user.role !== "fan") redirect("/createur");
  if (!user.ageVerifie) redirect("/verification-age");

  const fan = await prisma.fan.findUnique({ where: { userId: user.id }, include: { persona: true } });
  if (!fan) redirect("/");

  if (fan.banni) {
    return (
      <main className="container flex min-h-screen flex-col items-center justify-center gap-4 text-center">
        <h1 className="font-serif text-2xl">Accès suspendu</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Ton accès a été suspendu par le créateur{fan.banniRaison ? ` : ${fan.banniRaison}` : "."} Tu peux toujours demander la suppression de tes données.
        </p>
        <Link href="/fan/mes-donnees" className="text-or underline">Mes données</Link>
        <Deconnexion />
      </main>
    );
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <nav className="container flex h-12 items-center gap-4 text-sm">
          <Link href="/fan" className="font-serif text-lg text-or">{fan.persona.nom}</Link>
          <Link href="/fan/preferences" className="text-muted-foreground hover:text-foreground">Préférences</Link>
          <Link href="/fan/mes-donnees" className="text-muted-foreground hover:text-foreground">Mes données</Link>
          <div className="ml-auto"><Deconnexion /></div>
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
