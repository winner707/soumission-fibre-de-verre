import { z } from "zod";
import type { Verdict } from "@prisma/client";
import { classifier } from "@/lib/claude";
import { getModerationPrompt } from "@/lib/prompts";
import { prisma } from "@/lib/prisma";
import { anonymiser } from "@/lib/crypto";

/**
 * Modération à deux niveaux, appliquée aux ENTRÉES du fan et aux SORTIES du modèle :
 *  1. Filtre par mots-clés (instantané, gratuit) sur texte normalisé.
 *  2. Classification LLM (OK / limite / interdit) pour les cas non tranchés.
 * Un verdict "interdit" au niveau 1 est définitif : pas d'appel LLM.
 */

export type Categorie =
  | "explicite"
  | "mineurs"
  | "non_consentement"
  | "inceste"
  | "violence"
  | "illegal"
  | "usurpation"
  | "argent_rencontre"
  | "automutilation"
  | "detresse"
  | "manipulation"
  | "tabou_fan"
  | "limite_createur";

export interface ResultatModeration {
  verdict: Verdict;
  categories: string[];
  source: "mots-cles" | "llm";
  raison?: string;
}

interface Regle {
  categorie: Categorie;
  verdict: Exclude<Verdict, "ok">;
  motifs: RegExp[];
}

/** Minuscules, sans accents, espaces compactés ; `leet` décode le leetspeak basique (p0rn → porn). */
export function normaliser(texte: string, leet = false): string {
  let t = texte.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  if (leet) {
    t = t
      .replace(/0/g, "o")
      .replace(/1/g, "i")
      .replace(/3/g, "e")
      .replace(/4/g, "a")
      .replace(/5/g, "s")
      .replace(/@/g, "a")
      .replace(/\$/g, "s");
  }
  return t
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Les motifs s'appliquent au texte normalisé (sans accents). Liste volontairement
// conservatrice : les cas ambigus sont renvoyés au classificateur LLM ("limite").
const REGLES: Regle[] = [
  {
    categorie: "mineurs",
    verdict: "interdit",
    motifs: [
      /\b(mineure?s?|pedo\w*|lolita|underage|jailbait|preado\w*|collegien\w*|ecolier\w*|ecoliere\w*|schoolgirl)\b/,
      /\b(loli|shota)\b/,
    ],
  },
  {
    categorie: "mineurs",
    verdict: "limite",
    // Âges de 1 à 17 ans, "ado", "petite fille", "enfant" : contexte à vérifier par le LLM
    motifs: [/\b([1-9]|1[0-7]) ?(ans|yo|years? old)\b/, /\b(ados?|adolescente?s?|enfants?|gamine?s?|teen|kid|child)\b/],
  },
  {
    categorie: "explicite",
    verdict: "interdit",
    motifs: [
      /\b(porno?\w*|xxx|hentai|nudes?|masturb\w*|orgasm\w*|fellation\w*|cunnilingu\w*|sodomi\w*|penetr\w*|ejacul\w*|blowjob|handjob|sexe? explicite|sex tape|dick pic)\b/,
    ],
  },
  { categorie: "non_consentement", verdict: "interdit", motifs: [/\b(viol|violer|rape|non consenti\w*|sans (son|ton|mon) consentement|drogue[rz]? (la|le|une|un)|soumission chimique)\b/] },
  { categorie: "non_consentement", verdict: "limite", motifs: [/\b(forcer|force[rz]? a|contre (son|ta|sa) volonte)\b/] },
  { categorie: "inceste", verdict: "interdit", motifs: [/\b(incest\w*|inceste|stepsis\w*|stepbro\w*|step-sis\w*|step-bro\w*)\b/] },
  { categorie: "violence", verdict: "interdit", motifs: [/\b(tortur\w*|gore|etrangl\w*|egorg\w*|decapit\w*|snuff|choke me)\b/] },
  { categorie: "violence", verdict: "limite", motifs: [/\b(tuer|kill|frapper|battre|sang|blood|arme a feu)\b/] },
  { categorie: "automutilation", verdict: "limite", motifs: [/\b(suicid\w*|me tuer|en finir|scarif\w*|me faire du mal|kill myself)\b/] },
  { categorie: "illegal", verdict: "limite", motifs: [/\b(cocaine|heroine|meth|crack|drogue\w*|pirater|hacker|arnaque\w*|fausse carte)\b/] },
  { categorie: "usurpation", verdict: "limite", motifs: [/\b(deepfake|fais semblant d'etre|imite la voix|fais comme si tu etais|pretend to be)\b/] },
  { categorie: "argent_rencontre", verdict: "limite", motifs: [/\b(ton adresse|ton numero|rencontrer en vrai|se voir en vrai|iban|paypal|virement|envoie(-moi)? de l'argent)\b/] },
  {
    categorie: "manipulation",
    verdict: "limite",
    motifs: [/\b(ignore (tes|les|toutes les) (instructions|regles)|prompt systeme|system prompt|jailbreak|mode developpeur|developer mode|dan mode)\b/],
  },
];

/** Échappe une chaîne pour l'utiliser dans une RegExp. */
const echapper = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Détecte un sujet tabou du fan ou une limite personnalisée (mots-clés simples). */
function contientSujet(texteNorm: string, sujets: string[]): boolean {
  return sujets
    .map((s) => normaliser(s))
    .filter((s) => s.length >= 3)
    .some((s) => new RegExp(`\\b${echapper(s)}\\b`).test(texteNorm));
}

export interface ContexteModeration {
  sujetsTabous?: string[];
  limitesCreateur?: string[];
}

/** Niveau 1 : filtre par mots-clés. */
export function filtrerMotsCles(texte: string, ctx: ContexteModeration = {}): ResultatModeration {
  // On teste le texte brut normalisé ET sa version décodée du leetspeak
  // (le décodage casse les nombres, d'où les deux variantes).
  const variantes = [normaliser(texte), normaliser(texte, true)];
  const n = variantes[0];
  const categories = new Set<string>();
  let verdict: Verdict = "ok";

  for (const regle of REGLES) {
    if (regle.motifs.some((m) => variantes.some((v) => m.test(v)))) {
      categories.add(regle.categorie);
      if (regle.verdict === "interdit") verdict = "interdit";
      else if (verdict === "ok") verdict = "limite";
    }
  }
  if (ctx.sujetsTabous?.length && contientSujet(n, ctx.sujetsTabous)) {
    categories.add("tabou_fan");
    if (verdict === "ok") verdict = "limite";
  }
  return { verdict, categories: [...categories], source: "mots-cles" };
}

const SchemaModeration = z.object({
  verdict: z.enum(["ok", "limite", "interdit"]),
  categories: z.array(z.string()),
  raison: z.string(),
});

/** Niveau 2 : classification LLM avec sortie structurée. */
async function classifierLLM(texte: string, direction: "entree" | "sortie", ctx: ContexteModeration) {
  const contexte = [
    ctx.limitesCreateur?.length ? `Limites du créateur : ${ctx.limitesCreateur.join(" ; ")}` : "",
    ctx.sujetsTabous?.length ? `Sujets tabous du fan : ${ctx.sujetsTabous.join(" ; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
  return classifier(
    SchemaModeration,
    getModerationPrompt(),
    `${contexte}\n\nOrigine du texte : ${direction === "entree" ? "message du fan" : "réponse du compagnon"}.\n<texte>\n${texte.slice(0, 4000)}\n</texte>`,
    256,
  );
}

const rang: Record<Verdict, number> = { ok: 0, limite: 1, interdit: 2 };

/**
 * Modère un texte. Combine les deux niveaux et garde le verdict le plus sévère.
 * En cas d'erreur du LLM, on conserve le verdict des mots-clés (et on journalise).
 */
export async function moderer(
  texte: string,
  direction: "entree" | "sortie",
  ctx: ContexteModeration = {},
  options: { fanId?: string; llm?: boolean } = {},
): Promise<ResultatModeration> {
  let resultat = filtrerMotsCles(texte, ctx);

  if (resultat.verdict !== "interdit" && options.llm !== false) {
    try {
      const llm = await classifierLLM(texte, direction, ctx);
      if (llm && rang[llm.verdict] >= rang[resultat.verdict]) {
        resultat = {
          verdict: llm.verdict,
          categories: Array.from(new Set([...resultat.categories, ...llm.categories])),
          source: "llm",
          raison: llm.raison,
        };
      } else if (!llm && direction === "entree") {
        // Le classificateur a refusé de traiter le texte : on le traite comme sensible
        resultat = { ...resultat, verdict: resultat.verdict === "ok" ? "limite" : resultat.verdict };
      }
    } catch (e) {
      console.error("[moderation] classification LLM indisponible :", (e as Error).message);
    }
  }

  if (resultat.verdict !== "ok" && options.fanId) {
    // Journal anonymisé : hash du fan + catégories, jamais le contenu
    await prisma.moderationLog
      .create({
        data: {
          fanHash: anonymiser(options.fanId),
          direction,
          verdict: resultat.verdict,
          categories: resultat.categories,
          source: resultat.source,
        },
      })
      .catch((e) => console.error("[moderation] journalisation impossible :", e.message));
  }
  return resultat;
}

/** Vérifie si le message du fan contient son safe word (ou une commande d'arrêt universelle). */
export function contientSafeWord(message: string, safeWord: string): boolean {
  if (message.trim().toLowerCase() === "/stop") return true;
  const n = normaliser(message);
  const mot = normaliser(safeWord);
  return mot.length > 0 && (n === mot || new RegExp(`(^|\\s)${echapper(mot)}($|\\s)`).test(n));
}

/**
 * Détecte un fan qui déclare avoir moins de 18 ans (« j'ai 16 ans », « I'm 15 »…).
 * Conséquence dans la route de chat : accès suspendu jusqu'à une nouvelle vérification d'âge.
 */
export function declareMineur(message: string): boolean {
  const n = normaliser(message);
  return (
    /\b(j ?'? ?ai|i ?'? ?m|i am|je viens d ?'? ?avoir)\s*([1-9]|1[0-7])\s*(ans|an|yo|y o|years?( old)?)\b/.test(n) ||
    /\b(je suis|i ?'? ?m|i am)\s*(mineure?|underage|au college|au lycee|en (seconde|troisieme|quatrieme|premiere))\b/.test(n)
  );
}
