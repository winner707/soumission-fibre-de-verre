"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Pause, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

type Etat = "idle" | "loading" | "playing" | "paused" | "error";

/**
 * Lecteur audio d'un message du compagnon (voix ElevenLabs en streaming).
 * La source est /api/tts?messageId=… : la lecture démarre dès les premiers octets.
 * `stopSignal` : incrémenté par le parent (bouton Stop) pour couper le son immédiatement.
 */
export function AudioPlayer({
  messageId,
  autoPlay = false,
  stopSignal = 0,
}: {
  messageId: string;
  autoPlay?: boolean;
  stopSignal?: number;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [etat, setEtat] = useState<Etat>("idle");

  const src = `/api/tts?messageId=${encodeURIComponent(messageId)}`;

  const lire = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.src) {
      setEtat("loading");
      audio.src = src;
    }
    try {
      await audio.play();
    } catch {
      setEtat("error");
    }
  };

  useEffect(() => {
    if (autoPlay) void lire();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay]);

  // Bouton Stop global : on coupe le son
  useEffect(() => {
    if (stopSignal && audioRef.current) {
      audioRef.current.pause();
      setEtat((e) => (e === "idle" ? e : "paused"));
    }
  }, [stopSignal]);

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        preload="none"
        onPlaying={() => setEtat("playing")}
        onPause={() => setEtat((e) => (e === "error" ? e : "paused"))}
        onEnded={() => setEtat("paused")}
        onWaiting={() => setEtat("loading")}
        onError={() => setEtat("error")}
      />
      {etat === "error" ? (
        <span className="inline-flex items-center gap-1 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5" /> Voix indisponible
          <Button size="sm" variant="ghost" onClick={() => { if (audioRef.current) audioRef.current.removeAttribute("src"); void lire(); }}>
            Réessayer
          </Button>
        </span>
      ) : (
        <Button
          size="sm"
          variant="secondary"
          onClick={() => (etat === "playing" ? audioRef.current?.pause() : void lire())}
          aria-label={etat === "playing" ? "Pause" : "Écouter"}
        >
          {etat === "loading" ? <Loader2 className="animate-spin" /> : etat === "playing" ? <Pause /> : <Play />}
          {etat === "loading" ? "Chargement…" : etat === "playing" ? "Pause" : "Écouter"}
        </Button>
      )}
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Voix générée par IA</span>
    </div>
  );
}
