"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function FormulaireConnexion() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erreur, setErreur] = useState<string>();
  const [chargement, setChargement] = useState(false);

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setErreur(undefined);
    const res = await signIn("credentials", { email, password, redirect: false });
    setChargement(false);
    if (res?.error) {
      // NextAuth renvoie "CredentialsSignin" pour un mauvais mot de passe, sinon le message de l'erreur levée
      const messages: Record<string, string> = {
        CredentialsSignin: "Identifiants incorrects.",
        TROP_DE_TENTATIVES: "Trop de tentatives. Réessaie dans 15 minutes.",
        BASE_INDISPONIBLE: "Base de données injoignable : vérifie que PostgreSQL (Docker) est lancé.",
      };
      return setErreur(messages[res.error] ?? `Erreur serveur (${res.error}). Regarde le terminal.`);
    }
    router.push(params.get("callbackUrl") ?? "/");
    router.refresh();
  };

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Connexion</CardTitle>
        <CardDescription>Heureux de te revoir.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={soumettre} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {erreur && <p className="text-sm text-destructive">{erreur}</p>}
          <Button type="submit" className="w-full" disabled={chargement}>
            {chargement && <Loader2 className="animate-spin" />} Se connecter
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Pas encore de compte ? <Link href="/inscription" className="text-or underline-offset-4 hover:underline">Inscription (18+)</Link>
          </p>
        </form>
      </CardContent>
    </Card>
  );
}

export default function PageConnexion() {
  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Suspense>
        <FormulaireConnexion />
      </Suspense>
    </main>
  );
}
