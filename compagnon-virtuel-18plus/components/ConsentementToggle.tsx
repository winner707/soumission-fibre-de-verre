"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

/** Consentement explicite et révocable à tout moment. */
export function ConsentementToggle({ fanId, initial }: { fanId: string; initial: boolean }) {
  const router = useRouter();
  const [donne, setDonne] = useState(initial);
  const [chargement, setChargement] = useState(false);

  const changer = async (v: boolean) => {
    setChargement(true);
    const res = await fetch(`/api/fans/${fanId}/consentement`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ donne: v }),
    });
    setChargement(false);
    if (res.ok) {
      setDonne(v);
      router.refresh();
    }
  };

  return (
    <div className="flex items-start gap-3">
      <Switch id="consentement" checked={donne} disabled={chargement} onCheckedChange={changer} />
      <div className="space-y-1">
        <Label htmlFor="consentement">Je consens à échanger avec le compagnon virtuel (IA)</Label>
        <p className="text-xs text-muted-foreground">
          {donne ? "Consentement actif. Désactive-le pour tout mettre en pause immédiatement." : "Consentement retiré : aucune conversation possible."}
        </p>
      </div>
    </div>
  );
}
