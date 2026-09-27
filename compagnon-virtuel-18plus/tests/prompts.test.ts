import { describe, expect, it } from "vitest";
import type { Persona } from "@prisma/client";
import { getModerationPrompt, getSystemPrompt, noteModerationLimite, refusPoli, type PreferencesFan } from "@/lib/prompts";
import { LIMITES_GLOBALES, REFUS_PAR_DEFAUT } from "@/lib/limites";

const persona = {
  id: "p1",
  createurId: "c1",
  nom: "Lina",
  ageFictif: 27,
  style: "charmeuse",
  personnalite: "Aime le jazz.",
  centresInteret: ["jazz"],
  limites: ["Pas de politique"],
  reponsesTypes: { refus: "Parlons plutôt de voyages ?" },
  langue: "fr",
  voiceId: null,
  avatarSourceUrl: null,
  droitsImageVoix: true,
  actif: true,
  createdAt: new Date(),
  updatedAt: new Date(),
} as Persona;

const prefs: PreferencesFan = {
  pseudo: "Alex",
  prenom: "Alex",
  anniversaire: "15/06",
  ton: "taquin",
  sujetsAimes: ["musique"],
  sujetsTabous: ["travail"],
  safeWord: "ananas",
};

describe("getSystemPrompt", () => {
  const prompt = getSystemPrompt(persona, prefs, { gouts: ["cinéma"] });

  it("contient les phrases obligatoires du cahier des charges", () => {
    for (const phrase of [
      "Tu es Lina, un compagnon virtuel adulte. Tu es charmeur, taquin, à l'écoute, respectueux.",
      "Tu respectes strictement les limites définies par l'utilisateur et par le créateur.",
      "Tu ne génères jamais de contenu sexuellement explicite, illégal, violent, non consenti, impliquant des mineurs.",
      "Si une demande est interdite, tu refuses poliment et proposes un autre sujet.",
      "Tu vérifies le consentement avant d'aborder un sujet sensible.",
      "Tu ne casses jamais le personnage, mais tu restes safe.",
    ]) {
      expect(prompt).toContain(phrase);
    }
  });

  it("inclut toutes les limites globales, celles du créateur et les tabous du fan", () => {
    for (const l of LIMITES_GLOBALES) expect(prompt).toContain(l);
    expect(prompt).toContain("Pas de politique");
    expect(prompt).toContain("travail");
  });

  it("personnalise : ton, prénom, goûts mémorisés, safe word", () => {
    expect(prompt).toContain("taquin");
    expect(prompt).toContain("prénom : Alex");
    expect(prompt).toContain("cinéma");
    expect(prompt).toContain("ananas");
  });

  it("impose l'honnêteté sur la nature IA", () => {
    expect(prompt).toMatch(/compagnon virtuel généré par IA/);
  });

  it("est stable d'un appel à l'autre (cache de prompt)", () => {
    expect(getSystemPrompt(persona, prefs, { gouts: ["cinéma"] })).toBe(prompt);
  });
});

describe("refus et modération", () => {
  it("utilise le refus du créateur, sinon le refus par défaut", () => {
    expect(refusPoli(persona)).toBe("Parlons plutôt de voyages ?");
    expect(refusPoli({ reponsesTypes: {} })).toBe(REFUS_PAR_DEFAUT);
  });
  it("la note de modération est balisée", () => {
    expect(noteModerationLimite(["detresse"])).toMatch(/^<note_moderation>.*detresse.*<\/note_moderation>$/s);
  });
  it("le prompt de modération couvre les trois verdicts", () => {
    const p = getModerationPrompt();
    for (const v of ['"ok"', '"limite"', '"interdit"']) expect(p).toContain(v);
  });
});
