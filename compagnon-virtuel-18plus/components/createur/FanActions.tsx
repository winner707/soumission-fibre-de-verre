"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ban, Loader2, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Modération d'un fan par le créateur : bannir / réintégrer / supprimer ses données. */
export function FanActions({ fanId, banni }: { fanId: string; banni: boolean }) {
  const router = useRouter();
  const [raison, setRaison] = useState("");
  const [chargement, setChargement] = useState(false);

  const basculer = async () => {
    setChargement(true);
    await fetch(`/api/fans/${fanId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ banni: !banni, raison: raison || undefined }),
    });
    setChargement(false);
    router.refresh();
  };

  const supprimer = async () => {
    if (!confirm("Supprimer définitivement ce fan et toutes ses données ?")) return;
    await fetch(`/api/fans/${fanId}`, { method: "DELETE" });
    router.push("/createur/fans");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {!banni && <Input value={raison} onChange={(e) => setRaison(e.target.value)} placeholder="Raison (facultatif)" className="max-w-xs" />}
      <Button variant={banni ? "outline" : "destructive"} size="sm" onClick={basculer} disabled={chargement}>
        {chargement ? <Loader2 className="animate-spin" /> : banni ? <RotateCcw /> : <Ban />}
        {banni ? "Réintégrer" : "Bannir"}
      </Button>
      <Button variant="ghost" size="sm" onClick={supprimer}><Trash2 /> Supprimer les données</Button>
    </div>
  );
}
