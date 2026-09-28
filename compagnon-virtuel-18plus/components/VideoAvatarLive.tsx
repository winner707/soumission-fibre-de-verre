"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Loader2, Radio, VideoOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Avatar D-ID en temps réel (WebRTC, option DID_STREAMING=true).
 *
 * Le navigateur reçoit la vidéo directement de D-ID ; notre serveur ne relaie que la
 * signalisation (offre/réponse SDP, candidats ICE) via /api/avatar/stream, la clé API
 * restant côté serveur. L'avatar ne prononce que des messages déjà modérés (messageId).
 *
 * Quand l'avatar ne parle pas, D-ID n'envoie plus d'images : on affiche alors le portrait.
 */

type Etat = "inactif" | "connexion" | "connecte" | "erreur";

export interface VideoAvatarLiveHandle {
  /** Fait prononcer un message validé. Renvoie false si la session n'est pas prête. */
  parler: (messageId: string) => Promise<boolean>;
  /** Coupe immédiatement l'avatar (bouton Stop). */
  arreter: () => void;
  estConnecte: () => boolean;
}

interface Session {
  streamId: string;
  sessionId: string;
}

async function signal<T = unknown>(corps: Record<string, unknown>): Promise<T> {
  const res = await fetch("/api/avatar/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corps),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.erreur ?? `Erreur ${res.status}`);
  return data as T;
}

export const VideoAvatarLive = forwardRef<VideoAvatarLiveHandle, { portrait?: string | null; nom: string }>(
  function VideoAvatarLive({ portrait, nom }, ref) {
    const [etat, setEtat] = useState<Etat>("inactif");
    const [parle, setParle] = useState(false);
    const [erreur, setErreur] = useState<string>();
    const [portraitOk, setPortraitOk] = useState(true);
    const videoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const sessionRef = useRef<Session | null>(null);
    const statsRef = useRef<ReturnType<typeof setInterval>>();

    /** Ferme la connexion WebRTC et la session D-ID (facturée tant qu'elle est ouverte). */
    const fermer = useCallback(() => {
      clearInterval(statsRef.current);
      pcRef.current?.close();
      pcRef.current = null;
      const s = sessionRef.current;
      sessionRef.current = null;
      if (s) {
        // keepalive : la requête part même si l'onglet se ferme
        void fetch("/api/avatar/stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "fermer", ...s }),
          keepalive: true,
        }).catch(() => undefined);
      }
      if (videoRef.current) videoRef.current.srcObject = null;
      setParle(false);
    }, []);

    const connecter = useCallback(async () => {
      fermer();
      setEtat("connexion");
      setErreur(undefined);
      try {
        const { id, session_id, offer, ice_servers } = await signal<{
          id: string;
          session_id: string;
          offer: RTCSessionDescriptionInit;
          ice_servers: RTCIceServer[];
        }>({ action: "creer" });
        const session = { streamId: id, sessionId: session_id };
        sessionRef.current = session;

        const pc = new RTCPeerConnection({ iceServers: ice_servers });
        pcRef.current = pc;

        pc.onicecandidate = (e) => {
          if (!e.candidate) return;
          const { candidate, sdpMid, sdpMLineIndex } = e.candidate;
          void signal({ action: "ice", ...session, candidat: { candidate, sdpMid, sdpMLineIndex } }).catch(() => undefined);
        };
        pc.ontrack = (e) => {
          if (videoRef.current && e.streams[0]) videoRef.current.srcObject = e.streams[0];
        };
        pc.onconnectionstatechange = () => {
          if (pc.connectionState === "connected") setEtat("connecte");
          if (pc.connectionState === "failed" || pc.connectionState === "disconnected") {
            setErreur("Connexion interrompue");
            setEtat("erreur");
            fermer();
          }
        };

        await pc.setRemoteDescription(offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await signal({ action: "sdp", ...session, answer });

        // D-ID n'envoie des images que pendant la parole : on le détecte via les statistiques
        let octetsPrecedents = 0;
        statsRef.current = setInterval(async () => {
          const stats = await pc.getStats().catch(() => null);
          stats?.forEach((r) => {
            if (r.type === "inbound-rtp" && r.kind === "video") {
              setParle(r.bytesReceived > octetsPrecedents);
              octetsPrecedents = r.bytesReceived;
            }
          });
        }, 500);
      } catch (e) {
        setErreur((e as Error).message);
        setEtat("erreur");
        fermer();
      }
    }, [fermer]);

    useImperativeHandle(
      ref,
      () => ({
        parler: async (messageId) => {
          const s = sessionRef.current;
          if (!s || pcRef.current?.connectionState !== "connected") return false;
          try {
            await signal({ action: "parler", ...s, messageId });
            return true;
          } catch (e) {
            setErreur((e as Error).message);
            return false;
          }
        },
        arreter: () => {
          // Pas d'interruption partielle côté D-ID : on coupe la session, reconnexion en un clic
          if (sessionRef.current) {
            fermer();
            setEtat("inactif");
          }
        },
        estConnecte: () => pcRef.current?.connectionState === "connected",
      }),
      [fermer],
    );

    useEffect(() => fermer, [fermer]);

    return (
      <div className="flex items-center gap-4 rounded-xl border bg-card/80 p-3">
        <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg border bg-black">
          {portrait && portraitOk && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={portrait} alt={nom} onError={() => setPortraitOk(false)} className={cn("absolute inset-0 h-full w-full object-cover", parle && "opacity-0")} />
          )}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className={cn("absolute inset-0 h-full w-full object-cover", !parle && "opacity-0")}
          />
          {/* Mention obligatoire */}
          <span className="pointer-events-none absolute left-1 top-1 rounded bg-black/60 px-1 text-[9px] font-semibold uppercase text-white">
            IA
          </span>
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="flex items-center gap-2 text-sm">
            <Radio className={cn("h-4 w-4", etat === "connecte" ? "text-or" : "text-muted-foreground")} />
            {etat === "connecte"
              ? `${nom} est en direct${parle ? " — elle parle" : ""}`
              : etat === "connexion"
                ? "Connexion à l'avatar…"
                : "Avatar vidéo en direct"}
          </p>
          <p className="text-xs text-muted-foreground">
            {etat === "connecte"
              ? "« Réponse vidéo » la fait parler instantanément. Vidéo générée par IA."
              : etat === "erreur"
                ? `Indisponible (${erreur}). Les vidéos classiques restent disponibles.`
                : "Connecte l'avatar pour des réponses vidéo instantanées."}
          </p>
          {etat === "connecte" ? (
            <Button size="sm" variant="outline" onClick={() => { fermer(); setEtat("inactif"); }}>
              <VideoOff /> Déconnecter
            </Button>
          ) : (
            <Button size="sm" variant="secondary" onClick={connecter} disabled={etat === "connexion"}>
              {etat === "connexion" ? <Loader2 className="animate-spin" /> : <Radio />}
              {etat === "erreur" ? "Réessayer" : "Connecter l'avatar live"}
            </Button>
          )}
        </div>
      </div>
    );
  },
);
