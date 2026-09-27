import crypto from "node:crypto";

/**
 * Chiffrement symétrique AES-256-GCM des conversations (base de données et Redis).
 * Format de sortie : "iv:tag:données" en base64.
 */

let cleCache: Buffer | null = null;

function cle(): Buffer {
  if (cleCache) return cleCache;
  const brute = process.env.ENCRYPTION_KEY;
  if (brute) {
    const buf = Buffer.from(brute, "base64");
    if (buf.length !== 32) throw new Error("ENCRYPTION_KEY doit faire 32 octets encodés en base64.");
    cleCache = buf;
    return buf;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("ENCRYPTION_KEY est obligatoire en production.");
  }
  // Dev uniquement : clé dérivée de NEXTAUTH_SECRET pour pouvoir démarrer vite
  console.warn("[crypto] ENCRYPTION_KEY absente : clé de développement dérivée utilisée.");
  cleCache = crypto.createHash("sha256").update(process.env.NEXTAUTH_SECRET ?? "dev-uniquement").digest();
  return cleCache;
}

export function chiffrer(texte: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", cle(), iv);
  const donnees = Buffer.concat([cipher.update(texte, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), donnees.toString("base64")].join(":");
}

export function dechiffrer(payload: string): string {
  const [iv, tag, donnees] = payload.split(":");
  if (!iv || !tag || !donnees) throw new Error("Payload chiffré invalide.");
  const decipher = crypto.createDecipheriv("aes-256-gcm", cle(), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(donnees, "base64")), decipher.final()]).toString("utf8");
}

/** Identifiant anonymisé (HMAC) pour les journaux : impossible de remonter au fan sans la clé. */
export function anonymiser(identifiant: string): string {
  return crypto.createHmac("sha256", cle()).update(identifiant).digest("hex").slice(0, 16);
}

/** Hash stable pour les clés de cache (texte → fichier audio/vidéo). */
export function hashCache(...parties: string[]): string {
  return crypto.createHash("sha256").update(parties.join("␟")).digest("hex");
}
