"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { Download, Eraser, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Actions RGPD : export, effacement du contexte récent, suppression définitive. */
export function DonneesActions({ fanId }: { fanId: string }) {
  const [confirmation, setConfirmation] = useState("");
  const [chargement, setChargement] = useState(false);
  const [info, setInfo] = useState<string>();

  const effacerContexte = async () => {
    const res = await fetch("/api/chat/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effacerContexte: true }),
    });
    setInfo(res.ok ? "Contexte récent effacé." : "Action impossible.");
  };

  const supprimer = async () => {
    setChargement(true);
    const res = await fetch(`/api/fans/${fanId}`, { method: "DELETE" });
    if (res.ok) await signOut({ callbackUrl: "/" });
    else {
      setChargement(false);
      setInfo("Suppression impossible, réessaie ou contacte le support.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline">
          <a href={`/api/fans/${fanId}/export`}><Download /> Télécharger mes données (JSON)</a>
        </Button>
        <Button variant="outline" onClick={effacerContexte}><Eraser /> Effacer le contexte récent</Button>
      </div>

      <div className="space-y-3 rounded-lg border border-destructive/40 p-4">
        <p className="text-sm font-medium text-destructive">Droit à l&apos;oubli — suppression définitive</p>
        <p className="text-xs text-muted-foreground">
          Supprime ton compte, tes préférences, toutes tes conversations et la mémoire du compagnon. Action irréversible.
          Tape <strong>SUPPRIMER</strong> pour confirmer.
        </p>
        <div className="flex gap-2">
          <input
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            className="h-9 flex-1 rounded-md border bg-background/60 px-3 text-sm"
            aria-label="Confirmation"
          />
          <Button variant="destructive" disabled={confirmation !== "SUPPRIMER" || chargement} onClick={supprimer}>
            {chargement ? <Loader2 className="animate-spin" /> : <Trash2 />} Tout supprimer
          </Button>
        </div>
      </div>
      {info && <p className="text-sm text-muted-foreground">{info}</p>}
    </div>
  );
}
