"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export interface LigneFan {
  id: string;
  pseudo: string;
  ton: string;
  banni: boolean;
  consentementDonne: boolean;
  messages: number;
  signalements: number;
  dernierMessage: string | null;
}

/** Liste des fans du créateur avec indicateurs de modération. */
export function FanTable({ fans }: { fans: LigneFan[] }) {
  if (!fans.length) return <p className="text-sm text-muted-foreground">Aucun fan pour l&apos;instant.</p>;
  return (
    <div className="overflow-x-auto rounded-xl border">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
          <tr>
            <th className="p-3">Fan</th>
            <th className="p-3">Ton</th>
            <th className="p-3">Messages</th>
            <th className="p-3">Signalements</th>
            <th className="p-3">Dernière activité</th>
            <th className="p-3">Statut</th>
          </tr>
        </thead>
        <tbody>
          {fans.map((f) => (
            <tr key={f.id} className="border-t hover:bg-accent/40">
              <td className="p-3"><Link href={`/createur/fans/${f.id}`} className="text-or underline-offset-4 hover:underline">{f.pseudo}</Link></td>
              <td className="p-3 capitalize">{f.ton}</td>
              <td className="p-3">{f.messages}</td>
              <td className="p-3">{f.signalements > 0 ? <Badge variant="or">{f.signalements}</Badge> : "—"}</td>
              <td className="p-3 text-muted-foreground">{f.dernierMessage ? new Date(f.dernierMessage).toLocaleString("fr-FR") : "—"}</td>
              <td className="p-3">
                {f.banni ? <Badge variant="destructive">Banni</Badge> : !f.consentementDonne ? <Badge variant="secondary">Consentement retiré</Badge> : <Badge variant="outline">Actif</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
