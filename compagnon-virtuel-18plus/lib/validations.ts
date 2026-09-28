import { z } from "zod";
import { AGE_FICTIF_MIN, TONS } from "@/lib/limites";
import { calculerAge } from "@/lib/utils";

/** Schémas de validation partagés (API + formulaires). */

const listeCourte = z.array(z.string().trim().min(1).max(80)).max(30);

export const SchemaInscription = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(10, "10 caractères minimum").max(128),
  pseudo: z.string().trim().min(2).max(40),
  dateNaissance: z
    .string()
    .refine((d) => !Number.isNaN(Date.parse(d)), "Date invalide")
    .refine((d) => calculerAge(new Date(d)) >= 18, "Ce service est strictement réservé aux personnes majeures (18+)."),
  accepteCgu: z.literal(true, { message: "Vous devez accepter les CGU." }),
  consentement: z.literal(true, { message: "Le consentement explicite est requis." }),
  certifieMajeur: z.literal(true, { message: "Vous devez certifier avoir 18 ans ou plus." }),
});

export const SchemaPreferences = z.object({
  prenom: z.string().trim().max(40).nullable().optional(),
  anniversaire: z
    .string()
    .trim()
    .regex(/^(0[1-9]|[12]\d|3[01])\/(0[1-9]|1[0-2])$/, "Format JJ/MM")
    .nullable()
    .optional()
    .or(z.literal("")),
  ton: z.enum(TONS),
  sujetsAimes: listeCourte,
  sujetsTabous: listeCourte,
  safeWord: z.string().trim().min(2).max(30),
});

export const SchemaPersona = z.object({
  nom: z.string().trim().min(1).max(40),
  ageFictif: z.number().int().min(AGE_FICTIF_MIN, `Âge fictif minimum : ${AGE_FICTIF_MIN} ans`).max(99),
  style: z.string().trim().max(300),
  personnalite: z.string().trim().max(2000),
  centresInteret: listeCourte,
  limites: listeCourte,
  reponsesTypes: z.object({
    accueil: z.string().max(500).optional(),
    flirt: z.string().max(500).optional(),
    soutien: z.string().max(500).optional(),
    refus: z.string().max(500).optional(),
  }),
  langue: z.enum(["fr", "en"]),
  voiceId: z.string().trim().max(100).nullable().optional(),
  avatarSourceUrl: z.string().trim().url().startsWith("https://").nullable().optional().or(z.literal("")),
  droitsImageVoix: z.boolean(),
  actif: z.boolean(),
});

export const SchemaMessageChat = z.object({
  message: z.string().trim().min(1).max(2000),
});
