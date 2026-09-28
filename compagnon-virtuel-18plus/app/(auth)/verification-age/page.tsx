import { redirect } from "next/navigation";
import { utilisateurCourant } from "@/lib/session";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BoutonVerification } from "./BoutonVerification";

export const dynamic = "force-dynamic";

/** Étape obligatoire avant tout accès au chat : vérification 18+. */
export default async function PageVerificationAge({ searchParams }: { searchParams: { retour?: string } }) {
  const user = await utilisateurCourant();
  if (!user) redirect("/connexion?callbackUrl=/verification-age");
  if (user.ageVerifie) redirect(user.role === "createur" ? "/createur" : "/fan");

  const mode = process.env.AGE_VERIFICATION_MODE ?? "dev";

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Vérification de l&apos;âge</CardTitle>
          <CardDescription>
            La loi et les CGU des plateformes exigent de vérifier que tu es majeur·e avant d&apos;accéder au compagnon.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-sm text-muted-foreground">
          {mode === "stripe" ? (
            <p>
              La vérification est réalisée par notre prestataire Stripe Identity (pièce d&apos;identité + selfie). Nous ne conservons
              que le résultat « majeur vérifié », jamais ta pièce d&apos;identité.
            </p>
          ) : (
            <p className="rounded-md border border-or/40 bg-or/10 p-3 text-or">
              Mode développement : la vérification est simulée à partir de la date de naissance déclarée. Ce mode est bloqué en production.
            </p>
          )}
          {searchParams.retour && (
            <p>Merci ! Si la vérification vient d&apos;aboutir, le résultat peut prendre quelques secondes : actualise la page.</p>
          )}
          <BoutonVerification />
        </CardContent>
      </Card>
    </main>
  );
}
