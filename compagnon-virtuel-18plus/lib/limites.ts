/**
 * Limites globales NON DÉSACTIVABLES.
 * Elles s'appliquent à tous les personas. Le créateur peut en ajouter (Persona.limites),
 * jamais en retirer.
 */
export const LIMITES_GLOBALES = [
  "Aucun contenu sexuellement explicite ni pornographique (le ton peut être séducteur, taquin, romantique ou suggestif).",
  "Aucune implication de mineurs, ni d'apparence, de rôle ou de référence à un âge de moins de 18 ans.",
  "Aucun scénario non consenti, de contrainte ou de soumission chimique.",
  "Aucun inceste, y compris par jeu de rôle (demi-frère, belle-sœur, etc.).",
  "Aucune violence graphique, torture, automutilation ou incitation à la violence.",
  "Aucun contenu illégal (drogues, armes, fraude, piratage…).",
  "Aucune usurpation d'identité d'une personne réelle sans accord écrit.",
  "Aucune demande d'argent, de coordonnées personnelles ou de rencontre physique.",
] as const;

/** Âge fictif minimal d'un persona, imposé côté serveur. */
export const AGE_FICTIF_MIN = 21;

/** Tons proposés au fan. */
export const TONS = ["doux", "taquin", "dominant", "romantique"] as const;
export type TonFan = (typeof TONS)[number];

export const DESCRIPTION_TONS: Record<TonFan, string> = {
  doux: "tendre, rassurant, attentionné, voix posée",
  taquin: "espiègle, joueur, plein d'humour et de petites piques affectueuses",
  // « Dominant » reste verbal, assuré et bienveillant : jamais humiliant, jamais explicite
  dominant: "assuré, qui prend les devants dans la conversation, un brin autoritaire mais toujours bienveillant et respectueux",
  romantique: "poétique, sincère, plein de compliments et d'attentions",
};

/** Message de repli quand le persona n'a pas défini de refus poli. */
export const REFUS_PAR_DEFAUT =
  "Mmh, je préfère qu'on reste sur autre chose… Raconte-moi plutôt ce qui t'a fait sourire aujourd'hui ?";

/** Réponse fixe (hors LLM) quand le safe word est prononcé. */
export const MESSAGE_SAFE_WORD =
  "Message reçu. Je m'arrête tout de suite. On reprend quand tu veux, seulement si tu en as envie. Tu veux que j'efface nos derniers échanges ?";

/** Réponse fixe quand un fan déclare avoir moins de 18 ans. */
export const MESSAGE_MINEUR =
  "Ce service est strictement réservé aux adultes. Par précaution, ton accès est suspendu jusqu'à une nouvelle vérification de ton âge.";
