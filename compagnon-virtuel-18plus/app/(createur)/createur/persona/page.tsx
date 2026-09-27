import { exigerCreateur } from "@/lib/session";
import { LIMITES_GLOBALES } from "@/lib/limites";
import { lireReponsesTypes } from "@/lib/prompts";
import { PersonaForm } from "@/components/createur/PersonaForm";

export const dynamic = "force-dynamic";

export default async function PagePersona() {
  const { persona } = await exigerCreateur();
  return (
    <div className="max-w-4xl space-y-4">
      <h1 className="font-serif text-3xl">Persona & limites</h1>
      <PersonaForm
        limitesGlobales={LIMITES_GLOBALES}
        initial={{
          nom: persona?.nom ?? "",
          ageFictif: persona?.ageFictif ?? 25,
          style: persona?.style ?? "charmeur, taquin, à l'écoute",
          personnalite: persona?.personnalite ?? "",
          centresInteret: persona?.centresInteret ?? [],
          limites: persona?.limites ?? [],
          reponsesTypes: persona ? lireReponsesTypes(persona) : {},
          langue: persona?.langue === "en" ? "en" : "fr",
          voiceId: persona?.voiceId ?? null,
          avatarSourceUrl: persona?.avatarSourceUrl ?? null,
          droitsImageVoix: persona?.droitsImageVoix ?? false,
          actif: persona?.actif ?? false,
        }}
      />
    </div>
  );
}
