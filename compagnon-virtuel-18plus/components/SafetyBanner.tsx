"use client";

import Link from "next/link";
import { OctagonX, ShieldCheck, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Bandeau de sécurité toujours visible dans l'espace fan :
 * rappel 18+, contenu généré par IA, consentement, et bouton STOP immédiat.
 */
export function SafetyBanner({
  onStop,
  generationEnCours,
  safeWord,
}: {
  onStop: () => void;
  generationEnCours: boolean;
  safeWord?: string;
}) {
  return (
    <div className="sticky top-0 z-20 border-b bg-background/85 backdrop-blur">
      <div className="container flex flex-wrap items-center gap-x-4 gap-y-2 py-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-or">
          <ShieldCheck className="h-4 w-4" /> 18+ uniquement
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5" /> Réponses, voix et vidéos générées par IA
        </span>
        <span className="hidden sm:inline">
          Tu gardes le contrôle : {safeWord ? <>safe word « <strong className="text-foreground">{safeWord}</strong> »</> : "safe word"} ou bouton Stop à tout moment.
        </span>
        <Link href="/fan/preferences" className="underline-offset-4 hover:underline">
          Préférences & limites
        </Link>
        <Button
          size="sm"
          variant="destructive"
          className="ml-auto font-bold uppercase tracking-wide"
          onClick={onStop}
          aria-label="Arrêter immédiatement"
          title="Arrête immédiatement toute génération (texte, voix, vidéo)"
        >
          <OctagonX /> Stop{generationEnCours ? " maintenant" : ""}
        </Button>
      </div>
    </div>
  );
}
