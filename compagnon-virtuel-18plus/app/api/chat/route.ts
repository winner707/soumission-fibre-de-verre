import { NextResponse } from "next/server";
import type { Verdict } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { chiffrer, dechiffrer } from "@/lib/crypto";
import { exigerFan, reponseErreur } from "@/lib/session";
import { SchemaMessageChat } from "@/lib/validations";
import { contientSafeWord, declareMineur, filtrerMotsCles, moderer } from "@/lib/moderation";
import { getSystemPrompt, noteModerationLimite, refusPoli } from "@/lib/prompts";
import { extraireFaits, streamReponse } from "@/lib/claude";
import { ajouterEchange, ecrireFaits, lireFaits, lireHistorique } from "@/lib/memoire";
import { arreterGeneration, demarrerGeneration, reinitialiserStop, stopDemande, terminerGeneration } from "@/lib/abort-registry";
import { cles, kv } from "@/lib/redis";
import { MESSAGE_MINEUR, MESSAGE_SAFE_WORD } from "@/lib/limites";
import { anonymiser } from "@/lib/crypto";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Événements SSE envoyés au client :
 *  { type: "delta", text }              morceau de réponse
 *  { type: "replace", text }            la réponse a été bloquée par la modération → texte de remplacement
 *  { type: "safeword" }                 safe word détecté (le client propose d'effacer le contexte)
 *  { type: "stopped" }                  génération interrompue (bouton Stop)
 *  { type: "done", messageId, verdict } fin, message enregistré (utilisable pour audio / vidéo)
 *  { type: "error", message }
 */
type Evenement =
  | { type: "delta"; text: string }
  | { type: "replace"; text: string }
  | { type: "safeword" }
  | { type: "stopped" }
  | { type: "done"; messageId: string; verdict: Verdict }
  | { type: "error"; message: string };

const DEBIT_MAX_PAR_MINUTE = 20;

/** Traduit les erreurs courantes de l'API Anthropic en message clair (journal + mode dev). */
function diagnostiquer(e: unknown): string {
  const statut = (e as { status?: number }).status;
  const message = String((e as Error)?.message ?? "");
  if (!process.env.ANTHROPIC_API_KEY || /api[_ -]?key|x-api-key|authentication/i.test(message) || statut === 401) {
    return "Clé ANTHROPIC_API_KEY absente ou invalide : ajoutez-la dans .env puis relancez.";
  }
  if (/credit balance/i.test(message)) return "Crédit Anthropic épuisé : ajoutez du crédit sur console.anthropic.com (Billing).";
  if (statut === 404 || /model/i.test(message)) return "Modèle introuvable : vérifiez ANTHROPIC_MODEL dans .env.";
  if (statut === 429) return "Limite de requêtes Anthropic atteinte : réessayez dans un instant.";
  if (/ENOTFOUND|ECONNREFUSED|fetch failed|network/i.test(message)) return "Connexion à l'API Anthropic impossible (réseau / pare-feu).";
  return "Erreur inattendue";
}

/** GET : historique récent du fan (déchiffré), pour réafficher le chat. */
export async function GET() {
  try {
    const fan = await exigerFan();
    const messages = await prisma.message.findMany({
      where: { fanId: fan.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({
      messages: messages.reverse().map((m) => ({
        id: m.id,
        auteur: m.auteur,
        texte: dechiffrer(m.contenuChiffre),
        verdict: m.verdict,
        createdAt: m.createdAt,
      })),
    });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function POST(req: Request) {
  let fan;
  try {
    fan = await exigerFan();
  } catch (e) {
    return reponseErreur(e);
  }

  const parsed = SchemaMessageChat.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ erreur: "Message invalide." }, { status: 400 });
  // Empêche le fan d'imiter les notes internes du système
  const messageFan = parsed.data.message.replace(/<\/?note_moderation[^>]*>/gi, "");

  if ((await kv.incr(cles.debit(fan.id), 60)) > DEBIT_MAX_PAR_MINUTE) {
    return NextResponse.json({ erreur: "Doucement… laisse-moi le temps de répondre 😉" }, { status: 429 });
  }

  const enc = new TextEncoder();
  const persona = fan.persona;

  const flux = new ReadableStream<Uint8Array>({
    async start(controller) {
      const envoyer = (e: Evenement) => {
        try {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(e)}\n\n`));
        } catch {
          // Client déconnecté : on continue pour enregistrer proprement la réponse
        }
      };
      const enregistrer = (auteur: "fan" | "compagnon", texte: string, verdict: Verdict) =>
        prisma.message.create({ data: { fanId: fan.id, auteur, contenuChiffre: chiffrer(texte), verdict } });

      try {
        // 1. SAFE WORD : arrêt immédiat, réponse fixe (aucun appel au modèle)
        if (contientSafeWord(messageFan, fan.safeWord)) {
          await arreterGeneration(fan.id);
          await enregistrer("fan", messageFan, "ok");
          const m = await enregistrer("compagnon", MESSAGE_SAFE_WORD, "ok");
          envoyer({ type: "delta", text: MESSAGE_SAFE_WORD });
          envoyer({ type: "safeword" });
          envoyer({ type: "done", messageId: m.id, verdict: "ok" });
          return;
        }
        await reinitialiserStop(fan.id);

        // 1 bis. DÉCLARATION DE MINORITÉ : accès suspendu, nouvelle vérification d'âge exigée
        if (declareMineur(messageFan)) {
          await arreterGeneration(fan.id);
          await enregistrer("fan", messageFan, "interdit");
          await prisma.user.update({ where: { id: fan.userId }, data: { ageVerifie: false, ageMethode: "suspendu-declaration-mineur" } });
          await prisma.moderationLog.create({
            data: { fanHash: anonymiser(fan.id), direction: "entree", verdict: "interdit", categories: ["mineurs", "declaration_age"], source: "mots-cles" },
          });
          const m = await enregistrer("compagnon", MESSAGE_MINEUR, "ok");
          envoyer({ type: "delta", text: MESSAGE_MINEUR });
          envoyer({ type: "done", messageId: m.id, verdict: "ok" });
          return;
        }

        // 2. MODÉRATION D'ENTRÉE
        const ctxModeration = { sujetsTabous: fan.sujetsTabous, limitesCreateur: persona.limites };
        const entree = await moderer(messageFan, "entree", ctxModeration, { fanId: fan.id });
        await enregistrer("fan", messageFan, entree.verdict);

        if (entree.verdict === "interdit") {
          // Refus poli, dans le personnage, sans appeler le modèle principal
          const refus = refusPoli(persona);
          const m = await enregistrer("compagnon", refus, "ok");
          await ajouterEchange(fan.id, { role: "user", content: "[message retiré par la modération]" }, { role: "assistant", content: refus });
          envoyer({ type: "delta", text: refus });
          envoyer({ type: "done", messageId: m.id, verdict: "ok" });
          return;
        }

        // 3. GÉNÉRATION EN STREAMING
        const [historique, faits] = await Promise.all([lireHistorique(fan.id), lireFaits(fan.id)]);
        const ctrl = demarrerGeneration(fan.id);
        const stream = streamReponse({
          systemPrompt: getSystemPrompt(persona, fan, faits),
          historique,
          messageFan,
          noteModeration: entree.verdict === "limite" ? noteModerationLimite(entree.categories) : undefined,
          signal: ctrl.signal,
        });

        let texte = "";
        let bloque = false;
        let arrete = false;

        // Drapeau Redis (multi-instances) vérifié régulièrement
        const surveillance = setInterval(async () => {
          if (await stopDemande(fan.id)) {
            arrete = true;
            stream.abort();
          }
        }, 700);
        ctrl.signal.addEventListener("abort", () => {
          arrete = arrete || !bloque;
          stream.abort();
        });

        stream.on("text", (delta) => {
          if (bloque || arrete) return;
          texte += delta;
          // Filtre mots-clés en continu sur la sortie : coupure immédiate si interdit
          if (filtrerMotsCles(texte).verdict === "interdit") {
            bloque = true;
            stream.abort();
            return;
          }
          envoyer({ type: "delta", text: delta });
        });

        let refusModele = false;
        try {
          const final = await stream.finalMessage();
          refusModele = final.stop_reason === "refusal";
        } catch (e) {
          // Une annulation volontaire lève une erreur : on la distingue d'une vraie panne
          if (!bloque && !arrete) throw e;
        } finally {
          clearInterval(surveillance);
          terminerGeneration(fan.id, ctrl);
        }

        // 4. ARRÊT DEMANDÉ : on garde la réponse partielle
        if (arrete && !bloque) {
          const partiel = texte.trim() ? `${texte.trim()}…` : "…";
          const m = await enregistrer("compagnon", partiel, "ok");
          await ajouterEchange(fan.id, { role: "user", content: messageFan }, { role: "assistant", content: partiel });
          envoyer({ type: "stopped" });
          envoyer({ type: "done", messageId: m.id, verdict: "ok" });
          return;
        }

        // 5. MODÉRATION DE SORTIE (réponse complète)
        let verdictSortie: Verdict = "ok";
        if (bloque || refusModele) {
          verdictSortie = "interdit";
        } else {
          const sortie = await moderer(texte, "sortie", ctxModeration, { fanId: fan.id });
          verdictSortie = sortie.verdict;
        }

        let texteFinal = texte.trim();
        if (verdictSortie === "interdit" || !texteFinal) {
          texteFinal = refusPoli(persona);
          envoyer({ type: "replace", text: texteFinal });
        }

        // Seul le texte validé est enregistré : l'audio et la vidéo ne partent que de lui
        const m = await enregistrer("compagnon", texteFinal, verdictSortie === "interdit" ? "ok" : verdictSortie);
        const hist = await ajouterEchange(fan.id, { role: "user", content: messageFan }, { role: "assistant", content: texteFinal });
        envoyer({ type: "done", messageId: m.id, verdict: verdictSortie === "interdit" ? "ok" : verdictSortie });

        // 6. MÉMOIRE : extraction des faits toutes les 4 réponses, en arrière-plan
        if ((await kv.incr(cles.compteur(fan.id), 60 * 60 * 24 * 365)) % 4 === 0) {
          void extraireFaits(hist.slice(-8), faits)
            .then((f) => ecrireFaits(fan.id, f))
            .catch((err) => console.error("[memoire] extraction impossible :", err.message));
        }
      } catch (e) {
        const cause = diagnostiquer(e);
        console.error(`[chat] ${cause}`, e);
        // En développement, on affiche la cause exacte pour aider au réglage ; jamais en production
        const texte = process.env.NODE_ENV === "development" && cause !== "Erreur inattendue"
          ? `⚙️ (dev) ${cause}`
          : "Oups, j'ai perdu le fil… Tu peux répéter ?";
        envoyer({ type: "error", message: texte });
      } finally {
        try {
          controller.close();
        } catch {
          /* déjà fermé */
        }
      }
    },
  });

  return new Response(flux, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
