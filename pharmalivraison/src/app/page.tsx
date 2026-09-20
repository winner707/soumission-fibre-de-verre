import { SUPABASE_URL, isSupabaseConfigured } from "@/lib/env";
import { verifierSupabase, type EtatVerification } from "@/lib/diagnostics";

// Les verifications interrogent Supabase a chaque affichage : la page ne
// doit pas etre mise en cache au build.
export const dynamic = "force-dynamic";

const ETAPES = [
  { numero: 1, titre: "Socle Next.js, Tailwind et Supabase", etat: "fait" },
  { numero: 2, titre: "Schema de base de donnees et politiques RLS", etat: "a venir" },
  { numero: 3, titre: "Tableau de bord pharmacie", etat: "a venir" },
  { numero: 4, titre: "Interface livreur (signature et photo)", etat: "a venir" },
  { numero: 5, titre: "Notifications SMS Twilio", etat: "a venir" },
  { numero: 6, titre: "Journal d'audit et rapports de tracabilite", etat: "a venir" },
  { numero: 7, titre: "Connexion et gestion des roles", etat: "a venir" },
] as const;

const PASTILLES: Record<EtatVerification, { classe: string; libelle: string }> = {
  ok: { classe: "bg-succes", libelle: "OK" },
  echec: { classe: "bg-alerte", libelle: "Echec" },
  ignore: { classe: "bg-attente", libelle: "Non verifie" },
};

export default async function Accueil() {
  const verifications = await verifierSupabase();

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      <header>
        <p className="text-sm font-medium tracking-wide text-accent uppercase">
          Etape 1 terminee
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">PharmaLivraison</h1>
        <p className="mt-3 max-w-xl text-texte-doux">
          Livraison de medicaments a domicile pour les pharmacies
          independantes : signature obligatoire, tracabilite des produits
          controles et preuve de remise horodatee.
        </p>
      </header>

      <section
        aria-labelledby="titre-connexion"
        className="mt-10 rounded-xl border border-bordure bg-surface p-5 sm:p-6"
      >
        <h2 id="titre-connexion" className="text-lg font-semibold">
          Connexion a Supabase
        </h2>
        <p className="mt-1 text-sm text-texte-doux">
          {isSupabaseConfigured ? (
            <>
              Projet cible :{" "}
              <code className="font-mono text-xs break-all">{SUPABASE_URL}</code>
            </>
          ) : (
            <>
              Aucun projet configure. Copiez{" "}
              <code className="font-mono text-xs">.env.example</code> vers{" "}
              <code className="font-mono text-xs">.env.local</code>, renseignez
              les cles, puis relancez le serveur.
            </>
          )}
        </p>

        <ul className="mt-5 space-y-3">
          {verifications.map((verification) => {
            const pastille = PASTILLES[verification.etat];
            return (
              <li key={verification.nom} className="flex gap-3">
                <span
                  aria-hidden="true"
                  className={`mt-1.5 size-2.5 shrink-0 rounded-full ${pastille.classe}`}
                />
                <div className="min-w-0">
                  <p className="font-medium">
                    {verification.nom}{" "}
                    <span className="text-sm font-normal text-texte-doux">
                      — {pastille.libelle}
                    </span>
                  </p>
                  <p className="text-sm text-texte-doux">{verification.detail}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="titre-feuille-route" className="mt-10">
        <h2 id="titre-feuille-route" className="text-lg font-semibold">
          Feuille de route
        </h2>
        <ol className="mt-4 space-y-2">
          {ETAPES.map((etape) => (
            <li
              key={etape.numero}
              className="flex items-baseline gap-3 rounded-lg border border-bordure bg-surface px-4 py-3"
            >
              <span className="font-mono text-sm text-texte-doux">
                {etape.numero}
              </span>
              <span className="flex-1">{etape.titre}</span>
              <span
                className={`text-xs font-medium ${
                  etape.etat === "fait" ? "text-succes" : "text-texte-doux"
                }`}
              >
                {etape.etat === "fait" ? "Fait" : "A venir"}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </main>
  );
}
