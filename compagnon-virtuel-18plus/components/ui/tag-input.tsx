"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

/** Saisie de mots-clés : Entrée ou virgule pour ajouter, clic sur la croix pour retirer. */
export function TagInput({
  valeurs,
  onChange,
  placeholder,
  id,
}: {
  valeurs: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
  id?: string;
}) {
  const [saisie, setSaisie] = React.useState("");

  const ajouter = () => {
    const v = saisie.trim().replace(/,$/, "");
    if (v && !valeurs.includes(v)) onChange([...valeurs, v]);
    setSaisie("");
  };

  return (
    <div className="space-y-2">
      <Input
        id={id}
        value={saisie}
        placeholder={placeholder}
        onChange={(e) => setSaisie(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            ajouter();
          }
        }}
        onBlur={ajouter}
      />
      {valeurs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {valeurs.map((v) => (
            <Badge key={v} variant="secondary" className="gap-1 font-normal">
              {v}
              <button type="button" aria-label={`Retirer ${v}`} onClick={() => onChange(valeurs.filter((x) => x !== v))}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
