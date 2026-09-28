"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

interface Resultat {
  verdict: "ok" | "limite" | "interdit";
  categories: string[];
  source: string;
  raison?: string;
}

/** Permet au créateur de tester le filtre de modération (mots-clés + LLM). */
export function ModerationTester() {
  const [texte, setTexte] = useState("");
  const [res, setRes] = useState<Resultat>();
  const [chargement, setChargement] = useState(false);

  const tester = async () => {
    setChargement(true);
    const r = await fetch("/api/moderation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte }),
    });
    setRes(r.ok ? await r.json() : undefined);
    setChargement(false);
  };

  const couleur = res?.verdict === "ok" ? "secondary" : res?.verdict === "limite" ? "or" : "destructive";

  return (
    <div className="space-y-3">
      <Textarea value={texte} onChange={(e) => setTexte(e.target.value)} placeholder="Tape un message de fan pour voir comment il serait classé…" />
      <Button onClick={tester} disabled={!texte.trim() || chargement} size="sm">
        {chargement && <Loader2 className="animate-spin" />} Tester
      </Button>
      {res && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant={couleur}>{res.verdict.toUpperCase()}</Badge>
          {res.categories.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
          <span className="text-xs text-muted-foreground">({res.source}) {res.raison}</span>
        </div>
      )}
    </div>
  );
}
