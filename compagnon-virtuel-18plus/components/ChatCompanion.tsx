"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Radio, SendHorizontal, Trash2, Video, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AudioPlayer } from "@/components/AudioPlayer";
import { VideoAvatar } from "@/components/VideoAvatar";
import { VideoAvatarLive, type VideoAvatarLiveHandle } from "@/components/VideoAvatarLive";
import { SafetyBanner } from "@/components/SafetyBanner";
import { cn } from "@/lib/utils";

interface MessageUI {
  cle: string;
  id?: string; // id en base, disponible une fois le message validé (audio/vidéo possibles)
  auteur: "fan" | "compagnon";
  texte: string;
  media?: "audio" | "video" | "live";
  enCours?: boolean;
}

type EvenementSSE =
  | { type: "delta"; text: string }
  | { type: "replace"; text: string }
  | { type: "safeword" }
  | { type: "stopped" }
  | { type: "done"; messageId: string }
  | { type: "error"; message: string };

/**
 * Interface de chat avec le compagnon :
 * - streaming texte (SSE), bulles audio / vidéo à la demande
 * - bouton Stop (coupe texte, voix et vidéo) et gestion du safe word
 * - `modeLive` : avatar D-ID en direct (WebRTC) ; repli sur la vidéo classique sinon
 */
export function ChatCompanion({
  nomPersona,
  safeWord,
  modeLive = false,
  portrait,
}: {
  nomPersona: string;
  safeWord: string;
  modeLive?: boolean;
  portrait?: string | null;
}) {
  const [messages, setMessages] = useState<MessageUI[]>([]);
  const [saisie, setSaisie] = useState("");
  const [enCours, setEnCours] = useState(false);
  const [stopSignal, setStopSignal] = useState(0);
  const [proposerEffacement, setProposerEffacement] = useState(false);
  const [info, setInfo] = useState<string>();
  const abortRef = useRef<AbortController | null>(null);
  const liveRef = useRef<VideoAvatarLiveHandle>(null);
  const finRef = useRef<HTMLDivElement>(null);

  // Historique existant
  useEffect(() => {
    fetch("/api/chat")
      .then((r) => (r.ok ? r.json() : { messages: [] }))
      .then((d: { messages: { id: string; auteur: "fan" | "compagnon"; texte: string }[] }) =>
        setMessages(d.messages.map((m) => ({ cle: m.id, id: m.id, auteur: m.auteur, texte: m.texte }))),
      )
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  const majDernier = (f: (m: MessageUI) => MessageUI) =>
    setMessages((prev) => {
      const copie = [...prev];
      const i = copie.length - 1;
      if (i >= 0 && copie[i].auteur === "compagnon") copie[i] = f(copie[i]);
      return copie;
    });

  /** STOP : coupe le flux côté client ET côté serveur, et tout média en lecture. */
  const stop = useCallback(async (effacerContexte = false) => {
    abortRef.current?.abort();
    liveRef.current?.arreter();
    setStopSignal((n) => n + 1);
    setEnCours(false);
    majDernier((m) => ({ ...m, enCours: false }));
    const res = await fetch("/api/chat/stop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ effacerContexte }),
    }).catch(() => null);
    if (effacerContexte && res?.ok) {
      setProposerEffacement(false);
      setInfo("Contexte récent effacé. On repart à zéro, en douceur.");
    } else if (!effacerContexte) {
      setProposerEffacement(true);
    }
  }, []);

  const envoyer = async () => {
    const texte = saisie.trim();
    if (!texte || enCours) return;
    setSaisie("");
    setInfo(undefined);
    setProposerEffacement(false);
    setEnCours(true);
    setMessages((prev) => [
      ...prev,
      { cle: crypto.randomUUID(), auteur: "fan", texte },
      { cle: crypto.randomUUID(), auteur: "compagnon", texte: "", enCours: true },
    ]);

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: texte }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        majDernier((m) => ({ ...m, texte: data.erreur ?? "Je n'arrive pas à te répondre pour le moment.", enCours: false }));
        return;
      }

      // Lecture du flux SSE
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let tampon = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        tampon += decoder.decode(value, { stream: true });
        const blocs = tampon.split("\n\n");
        tampon = blocs.pop() ?? "";
        for (const bloc of blocs) {
          const ligne = bloc.split("\n").find((l) => l.startsWith("data: "));
          if (!ligne) continue;
          const ev = JSON.parse(ligne.slice(6)) as EvenementSSE;
          if (ev.type === "delta") majDernier((m) => ({ ...m, texte: m.texte + ev.text }));
          else if (ev.type === "replace") majDernier((m) => ({ ...m, texte: ev.text }));
          else if (ev.type === "safeword") {
            setStopSignal((n) => n + 1);
            liveRef.current?.arreter();
            setProposerEffacement(true);
          } else if (ev.type === "stopped") majDernier((m) => ({ ...m, texte: m.texte || "…" }));
          else if (ev.type === "done") majDernier((m) => ({ ...m, id: ev.messageId, enCours: false }));
          else if (ev.type === "error") majDernier((m) => ({ ...m, texte: ev.message, enCours: false }));
        }
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        majDernier((m) => ({ ...m, texte: m.texte || "Connexion perdue…", enCours: false }));
      }
    } finally {
      setEnCours(false);
      majDernier((m) => ({ ...m, enCours: false }));
      abortRef.current = null;
    }
  };

  const fixerMedia = (cle: string, media: MessageUI["media"]) =>
    setMessages((prev) => prev.map((m) => (m.cle === cle ? { ...m, media } : m)));

  /** Vidéo : via l'avatar live s'il est connecté, sinon génération classique (D-ID talks). */
  const demanderMedia = async (cle: string, media: "audio" | "video", messageId: string) => {
    if (media === "video" && liveRef.current?.estConnecte()) {
      fixerMedia(cle, "live");
      if (await liveRef.current.parler(messageId)) return;
    }
    fixerMedia(cle, media);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <SafetyBanner onStop={() => void stop()} generationEnCours={enCours} safeWord={safeWord} />

      <div className="container flex-1 space-y-4 py-6">
        {modeLive && <VideoAvatarLive ref={liveRef} portrait={portrait} nom={nomPersona} />}

        {messages.length === 0 && (
          <p className="py-16 text-center font-serif text-lg text-muted-foreground">
            Dis bonjour à <span className="text-or">{nomPersona}</span>…
          </p>
        )}

        {messages.map((m) => (
          <div key={m.cle} className={cn("flex flex-col gap-2", m.auteur === "fan" ? "items-end" : "items-start")}>
            <div className={m.auteur === "fan" ? "bulle-fan" : "bulle-compagnon"}>
              {m.auteur === "compagnon" && <div className="mb-1 font-serif text-xs text-or">{nomPersona}</div>}
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {m.texte}
                {m.enCours && <span className="ml-1 inline-block h-3 w-1.5 animate-pulse-soft bg-or align-middle" />}
              </p>
            </div>

            {m.auteur === "compagnon" && m.id && !m.enCours && (
              <div className="flex flex-wrap items-center gap-2 pl-1">
                {m.media === "audio" && <AudioPlayer messageId={m.id} autoPlay stopSignal={stopSignal} />}
                {m.media === "video" && <VideoAvatar messageId={m.id} stopSignal={stopSignal} />}
                {m.media === "live" && (
                  <span className="inline-flex items-center gap-1.5 text-xs text-or">
                    <Radio className="h-3.5 w-3.5" /> Prononcé par l&apos;avatar live (IA)
                  </span>
                )}
                {!m.media && (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => void demanderMedia(m.cle, "audio", m.id!)}>
                      <Volume2 /> Réponse vocale
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void demanderMedia(m.cle, "video", m.id!)}>
                      <Video /> Réponse vidéo
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
        ))}

        {proposerEffacement && (
          <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-xl border bg-card p-4 text-center text-sm">
            <p>Tout est arrêté. Veux-tu aussi que {nomPersona} oublie vos derniers échanges ?</p>
            <div className="flex gap-2">
              <Button size="sm" variant="destructive" onClick={() => void stop(true)}>
                <Trash2 /> Effacer le contexte récent
              </Button>
              <Button size="sm" variant="outline" onClick={() => setProposerEffacement(false)}>
                Non, garder
              </Button>
            </div>
          </div>
        )}
        {info && <p className="text-center text-xs text-muted-foreground">{info}</p>}
        <div ref={finRef} />
      </div>

      <div className="sticky bottom-0 border-t bg-background/90 backdrop-blur">
        <form
          className="container flex items-end gap-2 py-3"
          onSubmit={(e) => {
            e.preventDefault();
            void envoyer();
          }}
        >
          <Textarea
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void envoyer();
              }
            }}
            placeholder={`Écris à ${nomPersona}…  (safe word : « ${safeWord} »)`}
            maxLength={2000}
            rows={1}
            className="max-h-40 min-h-[44px] resize-none"
          />
          <Button type="submit" size="icon" className="h-11 w-11" disabled={enCours || !saisie.trim()} aria-label="Envoyer">
            {enCours ? <Loader2 className="animate-spin" /> : <SendHorizontal />}
          </Button>
        </form>
      </div>
    </div>
  );
}
