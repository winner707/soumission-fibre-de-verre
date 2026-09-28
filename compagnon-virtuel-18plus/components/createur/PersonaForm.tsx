"use client";

import { useState } from "react";
import { Check, Loader2, Lock, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { TagInput } from "@/components/ui/tag-input";
import { AGE_FICTIF_MIN } from "@/lib/limites";

export interface PersonaFormValues {
  nom: string;
  ageFictif: number;
  style: string;
  personnalite: string;
  centresInteret: string[];
  limites: string[];
  reponsesTypes: { accueil?: string; flirt?: string; soutien?: string; refus?: string };
  langue: "fr" | "en";
  voiceId: string | null;
  avatarSourceUrl: string | null;
  droitsImageVoix: boolean;
  actif: boolean;
}

/** Édition du persona : identité, voix & avatar, limites, réponses types. */
export function PersonaForm({ initial, limitesGlobales }: { initial: PersonaFormValues; limitesGlobales: readonly string[] }) {
  const [v, setV] = useState<PersonaFormValues>(initial);
  const [etat, setEtat] = useState<"idle" | "saving" | "ok" | "error">("idle");
  const [erreur, setErreur] = useState<string>();
  const [apercu, setApercu] = useState<string>();

  const maj = <K extends keyof PersonaFormValues>(k: K, val: PersonaFormValues[K]) => {
    setV((p) => ({ ...p, [k]: val }));
    setEtat("idle");
  };
  const majRt = (k: keyof PersonaFormValues["reponsesTypes"], val: string) => maj("reponsesTypes", { ...v.reponsesTypes, [k]: val });

  const enregistrer = async () => {
    setEtat("saving");
    const res = await fetch("/api/persona", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(v),
    });
    if (res.ok) setEtat("ok");
    else {
      setErreur((await res.json().catch(() => ({}))).erreur ?? "Erreur");
      setEtat("error");
    }
  };

  const ecouterVoix = async () => {
    const res = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texte: v.reponsesTypes.accueil || `Bonsoir, je suis ${v.nom}.` }),
    });
    if (res.ok) setApercu(URL.createObjectURL(await res.blob()));
    else setErreur((await res.json().catch(() => ({}))).erreur ?? "Aperçu indisponible (enregistrez d'abord la voix).");
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
          <CardDescription>Personnage fictif et adulte ({AGE_FICTIF_MIN} ans minimum).</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nom">Nom</Label>
            <Input id="nom" value={v.nom} onChange={(e) => maj("nom", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="age">Âge fictif</Label>
            <Input id="age" type="number" min={AGE_FICTIF_MIN} max={99} value={v.ageFictif} onChange={(e) => maj("ageFictif", Number(e.target.value))} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="style">Style</Label>
            <Input id="style" value={v.style} onChange={(e) => maj("style", e.target.value)} placeholder="charmeuse, taquine, mystérieuse…" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="perso">Personnalité & histoire</Label>
            <Textarea id="perso" rows={4} value={v.personnalite} onChange={(e) => maj("personnalite", e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="interets">Centres d&apos;intérêt</Label>
            <TagInput id="interets" valeurs={v.centresInteret} onChange={(x) => maj("centresInteret", x)} placeholder="jazz, voyages…" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="langue">Langue principale</Label>
            <select id="langue" value={v.langue} onChange={(e) => maj("langue", e.target.value as "fr" | "en")} className="h-9 w-full rounded-md border bg-background/60 px-3 text-sm">
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voix & avatar</CardTitle>
          <CardDescription>Voix ElevenLabs (eleven_multilingual_v2) et image source D-ID (URL HTTPS publique).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="voice">Voice ID ElevenLabs</Label>
              <Input id="voice" value={v.voiceId ?? ""} onChange={(e) => maj("voiceId", e.target.value || null)} placeholder="Laisser vide = ELEVENLABS_VOICE_ID" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="avatar">Image de l&apos;avatar (URL)</Label>
              <Input id="avatar" value={v.avatarSourceUrl ?? ""} onChange={(e) => maj("avatarSourceUrl", e.target.value || null)} placeholder="https://…/portrait.jpg" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="button" variant="outline" size="sm" onClick={ecouterVoix}><Play /> Écouter la voix</Button>
            {apercu && <audio src={apercu} controls autoPlay className="h-8" />}
          </div>
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={v.droitsImageVoix} onChange={(e) => maj("droitsImageVoix", e.target.checked)} className="mt-0.5" />
            <span className="text-muted-foreground">
              J&apos;atteste détenir tous les droits sur cette voix et cette image. S&apos;il s&apos;agit d&apos;une personne réelle, je dispose de son
              <strong> accord écrit</strong>. Aucune usurpation d&apos;identité.
            </span>
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Limites</CardTitle>
          <CardDescription>Les limites globales sont verrouillées. Ajoutez les vôtres : elles seront imposées au personnage et à la modération.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-1.5">
            {limitesGlobales.map((l) => (
              <li key={l} className="flex gap-2 text-sm text-muted-foreground"><Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-or" /> {l}</li>
            ))}
          </ul>
          <div className="space-y-2">
            <Label htmlFor="limites">Mes limites personnelles</Label>
            <TagInput id="limites" valeurs={v.limites} onChange={(x) => maj("limites", x)} placeholder="Ex. : Ne parle jamais de ma vie privée réelle" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Réponses types</CardTitle>
          <CardDescription>Le personnage s&apos;en inspire. Le refus poli est aussi utilisé tel quel quand la modération bloque un message.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          {(["accueil", "flirt", "soutien", "refus"] as const).map((k) => (
            <div key={k} className="space-y-2">
              <Label htmlFor={`rt-${k}`} className="capitalize">{k === "refus" ? "Refus poli" : k}</Label>
              <Textarea id={`rt-${k}`} rows={2} value={v.reponsesTypes[k] ?? ""} onChange={(e) => majRt(k, e.target.value)} />
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="sticky bottom-0 flex items-center gap-4 border-t bg-background/90 py-3 backdrop-blur">
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={v.actif} onCheckedChange={(c) => maj("actif", c)} /> Persona en ligne
        </label>
        <Button onClick={enregistrer} disabled={etat === "saving"}>
          {etat === "saving" ? <Loader2 className="animate-spin" /> : etat === "ok" ? <Check /> : null}
          {etat === "ok" ? "Enregistré" : "Enregistrer"}
        </Button>
        {(etat === "error" || erreur) && <span className="text-sm text-destructive">{erreur}</span>}
      </div>
    </div>
  );
}
