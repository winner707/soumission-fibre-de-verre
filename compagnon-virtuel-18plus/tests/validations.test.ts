import { describe, expect, it } from "vitest";
import { SchemaInscription, SchemaPersona, SchemaPreferences } from "@/lib/validations";
import { calculerAge } from "@/lib/utils";
import { normaliserHistorique } from "@/lib/claude";

const inscription = {
  email: "Test@Exemple.fr",
  password: "motdepasse123",
  pseudo: "Sam",
  dateNaissance: "1990-05-01",
  accepteCgu: true,
  consentement: true,
  certifieMajeur: true,
};

describe("inscription", () => {
  it("accepte un adulte consentant et normalise l'e-mail", () => {
    const r = SchemaInscription.safeParse(inscription);
    expect(r.success).toBe(true);
    expect(r.data?.email).toBe("test@exemple.fr");
  });
  it("refuse un mineur", () => {
    const annee = new Date().getFullYear() - 17;
    expect(SchemaInscription.safeParse({ ...inscription, dateNaissance: `${annee}-01-01` }).success).toBe(false);
  });
  it.each(["consentement", "accepteCgu", "certifieMajeur"] as const)("refuse sans %s", (champ) => {
    expect(SchemaInscription.safeParse({ ...inscription, [champ]: false }).success).toBe(false);
  });
});

describe("persona", () => {
  const persona = {
    nom: "Lina", ageFictif: 27, style: "", personnalite: "", centresInteret: [], limites: [],
    reponsesTypes: {}, langue: "fr", voiceId: null, avatarSourceUrl: null, droitsImageVoix: true, actif: true,
  };
  it("impose un âge fictif de 21 ans minimum", () => {
    expect(SchemaPersona.safeParse(persona).success).toBe(true);
    expect(SchemaPersona.safeParse({ ...persona, ageFictif: 18 }).success).toBe(false);
  });
  it("exige une URL d'avatar en HTTPS", () => {
    expect(SchemaPersona.safeParse({ ...persona, avatarSourceUrl: "http://x.fr/a.jpg" }).success).toBe(false);
  });
});

describe("préférences", () => {
  it("valide le format d'anniversaire JJ/MM", () => {
    const base = { ton: "doux", sujetsAimes: [], sujetsTabous: [], safeWord: "pause" };
    expect(SchemaPreferences.safeParse({ ...base, anniversaire: "15/06" }).success).toBe(true);
    expect(SchemaPreferences.safeParse({ ...base, anniversaire: "32/13" }).success).toBe(false);
  });
});

describe("utilitaires", () => {
  it("calculerAge tient compte du jour anniversaire", () => {
    expect(calculerAge(new Date("2000-06-15"), new Date("2018-06-14"))).toBe(17);
    expect(calculerAge(new Date("2000-06-15"), new Date("2018-06-15"))).toBe(18);
  });
  it("normaliserHistorique commence par user et fusionne les rôles consécutifs", () => {
    expect(
      normaliserHistorique([
        { role: "assistant", content: "orphelin" },
        { role: "user", content: "a" },
        { role: "user", content: "b" },
        { role: "assistant", content: "c" },
        { role: "assistant", content: "  " },
      ]),
    ).toEqual([
      { role: "user", content: "a\n\nb" },
      { role: "assistant", content: "c" },
    ]);
  });
});
