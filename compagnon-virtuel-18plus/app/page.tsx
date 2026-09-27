import Link from "next/link";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { authOptions } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Accueil : portail 18+ (aucun contenu avant confirmation de majorité et connexion). */
export default async function Accueil() {
  const session = await getServerSession(authOptions);
  if (session?.user) redirect(session.user.role === "createur" ? "/createur" : "/fan");

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-lg text-center">
        <CardHeader className="items-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full border border-or/40 bg-or/10 font-serif text-lg text-or">
            18+
          </div>
          <CardTitle className="text-3xl">Compagnon virtuel</CardTitle>
          <CardDescription>
            Un espace intime, élégant et respectueux. Conversations séductrices et taquines — jamais explicites.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-2 text-left text-sm text-muted-foreground">
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-or" /> Strictement réservé aux personnes majeures, avec vérification d&apos;âge.</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-or" /> Le personnage, sa voix et ses vidéos sont générés par intelligence artificielle.</li>
            <li className="flex gap-2"><ShieldCheck className="h-4 w-4 shrink-0 text-or" /> Tu fixes tes limites, ton safe word, et tu peux tout arrêter ou tout effacer à tout moment.</li>
          </ul>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button asChild size="lg"><Link href="/inscription">J&apos;ai 18 ans ou plus — Entrer</Link></Button>
            <Button asChild size="lg" variant="outline"><Link href="/connexion">Se connecter</Link></Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Tu as moins de 18 ans ? <a className="underline" href="https://www.google.com">Quitte ce site</a>.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
