"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BoutonVerification() {
  const router = useRouter();
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string>();

  const verifier = async () => {
    setChargement(true);
    setErreur(undefined);
    const res = await fetch("/api/verification-age", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setChargement(false);
      return setErreur(data.erreur ?? "Vérification impossible.");
    }
    if (data.url) window.location.href = data.url; // Stripe Identity
    else router.refresh();
  };

  return (
    <div className="space-y-2">
      <Button onClick={verifier} disabled={chargement} className="w-full">
        {chargement ? <Loader2 className="animate-spin" /> : <ShieldCheck />} Vérifier mon âge
      </Button>
      {erreur && <p className="text-sm text-destructive">{erreur}</p>}
    </div>
  );
}
