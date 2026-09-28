"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, VideoOff } from "lucide-react";
import { AudioPlayer } from "@/components/AudioPlayer";

type Etat = "generation" | "pret" | "erreur";

const INTERVALLE_POLLING = 2000;
const DELAI_MAX = 120_000;

/**
 * Vidéo d'avatar D-ID pour un message du compagnon.
 * États : génération (polling) → prêt (lecture) | erreur → repli automatique sur l'audio seul.
 */
export function VideoAvatar({ messageId, stopSignal = 0 }: { messageId: string; stopSignal?: number }) {
  const [etat, setEtat] = useState<Etat>("generation");
  const [url, setUrl] = useState<string>();
  const [erreur, setErreur] = useState<string>();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let annule = false;
    let minuteur: ReturnType<typeof setTimeout>;
    const debut = Date.now();

    const echec = (msg: string) => {
      if (annule) return;
      setErreur(msg);
      setEtat("erreur");
    };

    const suivre = async (talkId: string) => {
      if (annule) return;
      if (Date.now() - debut > DELAI_MAX) return echec("La vidéo prend trop de temps.");
      try {
        const res = await fetch(`/api/avatar?id=${encodeURIComponent(talkId)}`);
        const data = await res.json();
        if (!res.ok) return echec(data.erreur ?? "Erreur vidéo");
        if (data.statut === "done" && data.resultUrl) {
          setUrl(data.resultUrl);
          setEtat("pret");
        } else if (data.statut === "error" || data.statut === "rejected") {
          echec(data.erreur ?? "Génération refusée");
        } else {
          minuteur = setTimeout(() => suivre(talkId), INTERVALLE_POLLING);
        }
      } catch {
        echec("Connexion perdue");
      }
    };

    (async () => {
      try {
        const res = await fetch("/api/avatar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId }),
        });
        const data = await res.json();
        if (!res.ok) return echec(data.erreur ?? "Erreur vidéo");
        if (data.statut === "done" && data.resultUrl) {
          setUrl(data.resultUrl);
          setEtat("pret");
        } else void suivre(data.talkId);
      } catch {
        echec("Connexion perdue");
      }
    })();

    return () => {
      annule = true;
      clearTimeout(minuteur);
    };
  }, [messageId]);

  useEffect(() => {
    if (stopSignal) videoRef.current?.pause();
  }, [stopSignal]);

  if (etat === "erreur") {
    return (
      <div className="space-y-2 rounded-lg border border-dashed p-3">
        <p className="inline-flex items-center gap-2 text-xs text-muted-foreground">
          <VideoOff className="h-4 w-4" /> Vidéo indisponible ({erreur}). Voici la version audio :
        </p>
        <AudioPlayer messageId={messageId} autoPlay stopSignal={stopSignal} />
      </div>
    );
  }

  return (
    <div className="relative aspect-square w-full max-w-xs overflow-hidden rounded-xl border bg-black">
      {etat === "generation" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin text-or" />
          <span className="animate-pulse-soft">Elle se prépare…</span>
        </div>
      )}
      {etat === "pret" && url && (
        <video ref={videoRef} src={url} autoPlay playsInline controls className="h-full w-full object-cover" />
      )}
      {/* Mention obligatoire */}
      <span className="pointer-events-none absolute left-2 top-2 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white">
        Généré par IA
      </span>
    </div>
  );
}
