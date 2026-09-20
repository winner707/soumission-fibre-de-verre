# PharmaLivraison

Application SaaS de gestion des livraisons de medicaments a domicile pour les
pharmacies independantes : signature obligatoire, tracabilite des produits
controles, preuve de remise horodatee et geolocalisee.

## Etat d'avancement

| Etape | Contenu | Statut |
| --- | --- | --- |
| 1 | Socle Next.js + Tailwind + connexion Supabase | Fait |
| 2 | Schema de base de donnees et politiques RLS | A venir |
| 3 | Tableau de bord pharmacie | A venir |
| 4 | Interface livreur (signature, photo, geolocalisation) | A venir |
| 5 | Notifications SMS Twilio | A venir |
| 6 | Journal d'audit et rapports de tracabilite exportables | A venir |
| 7 | Page de connexion et gestion des roles | A venir |

## Stack

- **Next.js 16** (App Router, TypeScript)
- **Tailwind CSS 4**
- **Supabase** — authentification, PostgreSQL et stockage de fichiers
  (`@supabase/supabase-js` + `@supabase/ssr`)

## Demarrage

```bash
npm install
cp .env.example .env.local   # puis renseigner les cles Supabase
npm run dev
```

La page d'accueil (http://localhost:3000) affiche un diagnostic de connexion :
elle interroge les services d'authentification, de base de donnees et de
stockage du projet Supabase configure, et indique lesquels repondent.

L'application demarre meme sans configuration Supabase : le diagnostic
signale alors les variables manquantes au lieu de renvoyer une erreur.

### Creer le projet Supabase

1. Creer un projet sur [supabase.com](https://supabase.com).
2. Dans **Project Settings > API**, relever l'URL du projet, la cle publique
   (*publishable* / *anon*) et la cle de service (*service role*).
3. Reporter ces valeurs dans `.env.local`.
4. Dans **Authentication > URL Configuration**, ajouter
   `http://localhost:3000/auth/callback` aux *Redirect URLs* (et l'URL de
   production le moment venu).

## Variables d'environnement

| Variable | Obligatoire | Role |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | oui | URL du projet Supabase |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | oui | Cle publique, protegee par RLS |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | — | Ancien nom de la cle publique, accepte en repli |
| `SUPABASE_SERVICE_ROLE_KEY` | serveur | Cle d'administration, contourne RLS |
| `NEXT_PUBLIC_SITE_URL` | non | URL publique, pour les redirections d'auth |

`.env.local` n'est jamais versionne (voir `.gitignore`).

## Organisation du code

```
src/
  app/
    layout.tsx              Mise en page racine (lang="fr", polices, theme)
    page.tsx                Accueil + diagnostic de connexion Supabase
    auth/callback/route.ts  Echange du code d'authentification contre une session
    auth/erreur/page.tsx    Page d'erreur d'authentification
    globals.css             Jetons de couleur Tailwind, clair et sombre
  lib/
    env.ts                  Lecture et validation des variables d'environnement
    diagnostics.ts          Verification des services Supabase
    supabase/
      client.ts             Client navigateur (composants "use client")
      server.ts             Client serveur (composants serveur, actions, routes)
      admin.ts              Client cle de service, contourne RLS
      proxy.ts              Rafraichissement de session pour le proxy
      types.ts              Types de la base (substitut jusqu'a l'etape 2)
  proxy.ts                  Proxy Next.js 16 (ex-middleware) : session a chaque requete
```

### Quel client utiliser

- Composant client → `creerClientNavigateur()`
- Composant serveur, Server Action, Route Handler → `await creerClientServeur()`
- Traitement sans session utilisateur (audit, webhook Twilio, tache planifiee)
  → `creerClientAdmin()`, uniquement derriere un controle d'acces explicite

Le client serveur doit etre recree a chaque requete : ne jamais conserver
l'instance dans une variable de module.

### Rafraichissement de session

`src/proxy.ts` s'execute avant chaque rendu et appelle `getUser()`, ce qui
renouvelle les jetons expires et reecrit les cookies. Les composants serveur
ne pouvant pas ecrire de cookies, supprimer ce passage provoquerait des
deconnexions aleatoires. Le controle d'acces par role sera ajoute a l'etape 7.

## Scripts

```bash
npm run dev     # serveur de developpement
npm run build   # build de production
npm run start   # serveur de production
npm run lint    # ESLint
```
