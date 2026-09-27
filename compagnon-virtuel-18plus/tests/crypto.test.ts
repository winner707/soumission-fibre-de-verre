import { describe, expect, it } from "vitest";
import { anonymiser, chiffrer, dechiffrer, hashCache } from "@/lib/crypto";

describe("chiffrement AES-256-GCM", () => {
  it("chiffre puis déchiffre à l'identique", () => {
    const texte = "Bonsoir toi… 😉 accents : éàü";
    const c = chiffrer(texte);
    expect(c).not.toContain("Bonsoir");
    expect(dechiffrer(c)).toBe(texte);
  });
  it("produit un chiffré différent à chaque fois (IV aléatoire)", () => {
    expect(chiffrer("x")).not.toBe(chiffrer("x"));
  });
  it("rejette un chiffré modifié", () => {
    const [iv, tag, data] = chiffrer("secret").split(":");
    const altere = Buffer.from(data, "base64");
    altere[0] ^= 1;
    expect(() => dechiffrer([iv, tag, altere.toString("base64")].join(":"))).toThrow();
  });
});

describe("anonymisation et cache", () => {
  it("anonymiser est stable et ne révèle pas l'identifiant", () => {
    expect(anonymiser("fan_123")).toBe(anonymiser("fan_123"));
    expect(anonymiser("fan_123")).not.toContain("fan_123");
    expect(anonymiser("fan_123")).toHaveLength(16);
  });
  it("hashCache dépend de chaque partie", () => {
    expect(hashCache("voix", "texte")).not.toBe(hashCache("voix", "texte2"));
    expect(hashCache("a", "bc")).not.toBe(hashCache("ab", "c"));
  });
});
