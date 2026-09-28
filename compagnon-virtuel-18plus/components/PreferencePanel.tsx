"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagInput } from "@/components/ui/tag-input";
import { DESCRIPTION_TONS, TONS, type TonFan } from "@/lib/limites";
import { cn } from "@/lib/utils";

export interface Preferences {
  prenom: string | null;
  anniversaire: string | null;
  ton: TonFan;
  sujetsAimes: string[];
  sujetsTabous: string[];
  safeWord: string;
}

/**
 * Panneau de préférences du fan : ton, sujets aimés, sujets tabous, safe word.
 * Le compagnon applique ces réglages dès le message suivant.
 */
export function PreferencePanel({ fanId, initial }: { fanId: string; initial: Preferences }) {
  const [p, setP] = useState<Preferences>(initial);
  const [etat, setEtat] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [erreur, setErreur] = useState<string>();

  const maj = <K extends keyof Preferences>(k: K, v: Preferences[K]) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setEtat("idle");
  };

  const enregistrer = async () => {
    setEtat("saving");
    const res = await fetch(`/api/fans/${fanId}/preferences`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...p, anniversaire: p.anniversaire || null, prenom: p.prenom || null }),
    });
    if (res.ok) setEtat("ok");
    else {
      setErreur((await res.json().catch(() => ({}))).erreur ?? "Erreur");
      setEtat("error");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tes préférences</CardTitle>
        <CardDescription>Tu décides du ton et des limites. Tout est modifiable à tout moment.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Ton de la conversation</Label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TONS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => maj("ton", t)}
                className={cn(
                  "rounded-lg border p-3 text-left text-sm capitalize transition-colors",
                  p.ton === t ? "border-or bg-or/10 text-or" : "hover:bg-accent",
                )}
                title={DESCRIPTION_TONS[t]}
              >
                {t}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">{DESCRIPTION_TONS[p.ton]}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="prenom">Prénom (facultatif)</Label>
            <Input id="prenom" value={p.prenom ?? ""} onChange={(e) => maj("prenom", e.target.value)} maxLength={40} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="anniv">Anniversaire (JJ/MM, facultatif)</Label>
            <Input id="anniv" value={p.anniversaire ?? ""} onChange={(e) => maj("anniversaire", e.target.value)} placeholder="15/06" />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="aimes">Sujets que tu aimes</Label>
          <TagInput id="aimes" valeurs={p.sujetsAimes} onChange={(v) => maj("sujetsAimes", v)} placeholder="musique, voyages… (Entrée pour ajouter)" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tabous">Sujets tabous (jamais abordés)</Label>
          <TagInput id="tabous" valeurs={p.sujetsTabous} onChange={(v) => maj("sujetsTabous", v)} placeholder="travail, ex… (Entrée pour ajouter)" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="safe">Safe word</Label>
          <Input id="safe" value={p.safeWord} onChange={(e) => maj("safeWord", e.target.value)} maxLength={30} />
          <p className="text-xs text-muted-foreground">
            Écris-le à n&apos;importe quel moment (ou <code>/stop</code>) : tout s&apos;arrête immédiatement et tu peux effacer le contexte récent.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button onClick={enregistrer} disabled={etat === "saving"}>
            {etat === "saving" ? <Loader2 className="animate-spin" /> : etat === "ok" ? <Check /> : null}
            {etat === "ok" ? "Enregistré" : "Enregistrer"}
          </Button>
          {etat === "error" && <span className="text-sm text-destructive">{erreur}</span>}
        </div>
      </CardContent>
    </Card>
  );
}
