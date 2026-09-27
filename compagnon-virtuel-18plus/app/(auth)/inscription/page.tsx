"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Inscription fan : date de naissance (18+), certification de majorité,
 * acceptation des CGU et consentement explicite. La vérification d'âge suit.
 */
export default function PageInscription() {
  const router = useRouter();
  const [f, setF] = useState({
    email: "",
    password: "",
    pseudo: "",
    dateNaissance: "",
    certifieMajeur: false,
    accepteCgu: false,
    consentement: false,
  });
  const [erreur, setErreur] = useState<string>();
  const [chargement, setChargement] = useState(false);

  const maj = (k: keyof typeof f, v: string | boolean) => setF((p) => ({ ...p, [k]: v }));

  const soumettre = async (e: React.FormEvent) => {
    e.preventDefault();
    setChargement(true);
    setErreur(undefined);
    const res = await fetch("/api/fans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    if (!res.ok) {
      setChargement(false);
      return setErreur((await res.json().catch(() => ({}))).erreur ?? "Inscription impossible.");
    }
    await signIn("credentials", { email: f.email, password: f.password, redirect: false });
    router.push("/verification-age");
  };

  const Case = ({ k, children }: { k: "certifieMajeur" | "accepteCgu" | "consentement"; children: React.ReactNode }) => (
    <label className="flex items-start gap-2 text-sm text-muted-foreground">
      <input type="checkbox" required checked={f[k]} onChange={(e) => maj(k, e.target.checked)} className="mt-0.5 accent-[hsl(var(--primary))]" />
      <span>{children}</span>
    </label>
  );

  return (
    <main className="container flex min-h-screen items-center justify-center py-12">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Inscription — 18+ uniquement</CardTitle>
          <CardDescription>Une vérification d&apos;âge sera demandée juste après.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={soumettre} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pseudo">Pseudo</Label>
              <Input id="pseudo" required minLength={2} maxLength={40} value={f.pseudo} onChange={(e) => maj("pseudo", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" autoComplete="email" required value={f.email} onChange={(e) => maj("email", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe (10 caractères min.)</Label>
              <Input id="password" type="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={(e) => maj("password", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date de naissance</Label>
              <Input id="dob" type="date" required value={f.dateNaissance} onChange={(e) => maj("dateNaissance", e.target.value)} />
            </div>
            <div className="space-y-3 rounded-lg border p-3">
              <Case k="certifieMajeur">Je certifie avoir 18 ans ou plus et l&apos;âge légal de majorité dans mon pays.</Case>
              <Case k="accepteCgu">J&apos;accepte les conditions d&apos;utilisation et la politique de confidentialité.</Case>
              <Case k="consentement">
                Je consens explicitement à échanger avec un compagnon virtuel <strong>généré par IA</strong>, au ton séducteur mais
                non explicite. Je sais que je peux retirer ce consentement, utiliser un safe word et supprimer mes données à tout moment.
              </Case>
            </div>
            {erreur && <p className="text-sm text-destructive">{erreur}</p>}
            <Button type="submit" className="w-full" disabled={chargement}>
              {chargement && <Loader2 className="animate-spin" />} Créer mon compte
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Déjà inscrit ? <Link href="/connexion" className="text-or underline-offset-4 hover:underline">Connexion</Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
