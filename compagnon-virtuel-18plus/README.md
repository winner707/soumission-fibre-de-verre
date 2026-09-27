# Compagnon virtuel 18+

Application web qui permet à un **créateur adulte** de proposer à ses fans un **compagnon virtuel** généré par IA : chat en streaming (Claude), **voix réaliste** (ElevenLabs) et **avatar vidéo** qui parle et réagit (D-ID).

> Le ton peut être séducteur, taquin, romantique ou suggestif, **jamais pornographique**. Sécurité, consentement et respect des limites sont intégrés à chaque couche du code.

---

## ⚠️ Avertissements légaux et éthiques

- **Strictement réservé aux 18 ans et plus.** L'inscription exige une date de naissance majeure, une certification et une **vérification d'âge** (Stripe Identity : pièce d'identité + selfie). Un fan qui déclare avoir moins de 18 ans dans le chat est **suspendu automatiquement** et doit repasser une vérification par pièce d'identité.
- **Interdits absolus, codés en dur** (`lib/limites.ts`) : mineurs, non-consentement, inceste, violence, contenu illégal, contenu sexuellement explicite, usurpation d'identité d'une personne réelle sans accord écrit, demandes d'argent ou de rencontre. Le créateur peut **ajouter** des limites, jamais en retirer.
- **Consentement explicite et révocable** : donné à l'inscription, révocable à tout moment (le chat est alors bloqué immédiatement).
- **Safe word et bouton Stop** : ils arrêtent immédiatement la génération (texte, voix, vidéo) et permettent d'effacer le contexte récent.
- **Transparence** : mention « généré par IA » sur les réponses, l'audio et les vidéos. Si le fan demande sincèrement s'il parle à un humain, le personnage répond honnêtement qu'il est une IA.
- **Voix et image** : le créateur doit attester détenir les droits (et un **accord écrit** s'il s'agit d'une personne réelle) avant de mettre le persona en ligne.
- **RGPD** : conversations chiffrées (AES-256-GCM), journaux de modération anonymisés, export des données, **droit à l'oubli** (suppression complète).
- Vous restez responsable du respect des **lois locales** et des **CGU** des plateformes (OnlyFans, Stripe, ElevenLabs, D-ID, Anthropic). Ce code est une base technique, **pas un avis juridique** : faites valider votre déploiement par un juriste.

---

## Stack

| Rôle | Technologie |
|---|---|
| Framework | Next.js 14 (App Router) + TypeScript |
| UI | TailwindCSS + composants shadcn/ui, thème sombre « lounge » |
| LLM | Anthropic Claude via `@anthropic-ai/sdk` (modèle configurable, `claude-sonnet-5` par défaut) |
| Voix | ElevenLabs `eleven_multilingual_v2` (streaming + cache disque) |
| Avatar | D-ID (`/talks` asynchrone + polling ; WebRTC `/talks/streams` en option) |
| Temps réel | Server-Sent Events pour le texte ; WebRTC D-ID pour la vidéo en direct (option) |
| Données | PostgreSQL + Prisma |
| Mémoire / cache | Redis (repli en mémoire en dev si `REDIS_URL` est absent) |
| Auth | NextAuth (identifiants, JWT, rôles `createur` / `fan`) |
| Vérification d'âge / paiement | Stripe Identity (paiement Stripe : prévu, hors MVP) |

---

## Installation

Prérequis : Node.js ≥ 20, PostgreSQL ≥ 14, Redis ≥ 6 (facultatif en dev).

```bash
cd compagnon-virtuel-18plus
npm install
cp .env.example .env        # puis remplir les clés (voir ci-dessous)

# Générer les secrets
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # → NEXTAUTH_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"   # → ENCRYPTION_KEY

npm run db:push             # crée les tables
npm run db:seed             # données de démo (créateur, persona « Lina », fan)
npm run dev                 # http://localhost:3000
```

Pour lancer PostgreSQL et Redis rapidement avec Docker :

```bash
docker run -d --name pg -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=compagnon -p 5432:5432 postgres:16
docker run -d --name redis -p 6379:6379 redis:7
```

### Clés API

| Variable | Où l'obtenir | Remarque |
|---|---|---|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | |
| `ANTHROPIC_MODEL` | — | `claude-sonnet-5` par défaut ; `claude-sonnet-4-5` accepté |
| `ANTHROPIC_MODERATION_MODEL` | — | `claude-haiku-4-5` (classification rapide et économique) |
| `ELEVENLABS_API_KEY` | elevenlabs.io → Profile → API Keys | |
| `ELEVENLABS_VOICE_ID` | Voice Library → « ID » d'une voix | voix par défaut si le persona n'en a pas |
| `DID_API_KEY` | studio.d-id.com → API Keys | utilisée telle quelle en `Authorization: Basic` |
| `DID_DEFAULT_SOURCE_URL` | URL HTTPS publique d'un portrait | image dont vous détenez les droits |
| `DID_STREAMING` | — | `true` pour activer la route WebRTC temps réel |
| `DATABASE_URL`, `REDIS_URL` | vos instances | |
| `NEXTAUTH_SECRET`, `NEXTAUTH_URL` | — | |
| `ENCRYPTION_KEY` | générée ci-dessus | **obligatoire en production** ; la perdre rend les conversations illisibles |
| `AGE_VERIFICATION_MODE` | — | `dev` (simulation, **refusée en production**) ou `stripe` |
| `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | dashboard.stripe.com | Stripe Identity doit être activé ; webhook `identity.verification_session.verified` → `/api/verification-age/webhook` |

---

## Architecture

```
app/
  page.tsx                          portail 18+
  (auth)/connexion | inscription | verification-age
  (createur)/createur/              tableau de bord, persona & limites, fans, conversation d'un fan
  (fan)/fan/                        chat, préférences & consentement, mes données (RGPD)
  api/
    chat/            POST streaming SSE (modération entrée/sortie, mémoire), GET historique
    chat/stop/       POST arrêt immédiat (+ effacement du contexte récent)
    tts/             GET ?messageId= → audio/mpeg en streaming ; POST aperçu voix (créateur)
    avatar/          POST création vidéo D-ID ; GET ?id= polling
    avatar/stream/   signalisation WebRTC D-ID (option)
    fans/            POST inscription ; GET liste (créateur)
    fans/[id]/       GET, PATCH (bannir), DELETE (droit à l'oubli)
      preferences/ consentement/ export/ messages/
    persona/         GET / PUT persona (créateur)
    moderation/      POST tester un texte ; GET statistiques anonymisées
    verification-age/ (+ webhook Stripe)
lib/
  claude.ts         wrapper Anthropic : streaming annulable, sorties structurées, extraction de faits
  prompts.ts        getSystemPrompt(persona, prefs, faits), getModerationPrompt()
  moderation.ts     mots-clés + classification LLM, safe word, détection de minorité déclarée
  elevenlabs.ts     TTS streaming + cache sha256 → .cache/tts/*.mp3
  avatar.ts         D-ID : upload audio, /talks, polling, cache Redis, émotions, WebRTC
  memoire.ts        historique court + faits mémorisés (Redis, chiffrés)
  limites.ts        limites globales non désactivables, tons, messages fixes
  crypto.ts         AES-256-GCM, anonymisation HMAC, hash de cache
  auth.ts session.ts acces-fan.ts messages.ts   auth et contrôles d'accès
components/
  ChatCompanion.tsx  AudioPlayer.tsx  VideoAvatar.tsx  PreferencePanel.tsx  SafetyBanner.tsx
  createur/ PersonaForm, FanTable, FanActions, ModerationTester
prisma/schema.prisma  seed.ts
```

### Parcours d'un message

1. **Safe word** (ou `/stop`) → arrêt immédiat, réponse fixe **sans appel au modèle**, proposition d'effacer le contexte.
2. **Minorité déclarée** (« j'ai 16 ans ») → accès suspendu, nouvelle vérification d'âge par pièce d'identité exigée.
3. **Modération d'entrée** : mots-clés, puis classification LLM (`ok` / `limite` / `interdit`).
   - `interdit` → refus poli du persona, sans appeler le modèle principal.
   - `limite` → une note interne demande au personnage de vérifier le consentement ou de réorienter.
4. **Génération en streaming** (SSE). Le filtre mots-clés tourne **en continu** sur la sortie et coupe le flux si besoin.
5. **Modération de sortie** sur la réponse complète. Si elle est interdite, la réponse est remplacée par le refus poli.
6. Seul le texte **validé** est enregistré (chiffré). La voix et la vidéo ne peuvent être générées **qu'à partir d'un `messageId` validé**, jamais d'un texte libre.
7. Toutes les 4 réponses, extraction en arrière-plan des faits mémorables (prénom, anniversaire, goûts, sujets).

---

## Test rapide

Après `npm run db:seed` :

| Rôle | E-mail | Mot de passe |
|---|---|---|
| Créateur | `createur@demo.local` | `demo-createur-123` |
| Fan (safe word « pause ») | `fan@demo.local` | `demo-fan-123` |

Sans aucune clé API, vous pouvez déjà tester : connexion, contrôle d'accès, inscription, vérification d'âge simulée, safe word, blocage des messages interdits par mots-clés, consentement, bannissement, export et suppression. Le chat « normal », la voix et la vidéo nécessitent les clés correspondantes.

## Plan de test manuel

1. **Créateur configure le persona** — se connecter en créateur → *Persona & limites* : modifier le nom, le style, les centres d'intérêt, ajouter une limite perso (ex. « ne parle jamais de politique »), renseigner le Voice ID ElevenLabs et l'URL de l'avatar, cocher l'attestation des droits, mettre en ligne, **Enregistrer**. Cliquer sur **Écouter la voix**. Essayer un âge fictif de 18 → refusé (21 minimum).
2. **Tester la modération** — *Tableau de bord* → « Tester la modération » : `tu es magnifique ce soir` → OK ; `parlons de politique` → limite ; `envoie des nudes` → INTERDIT.
3. **Fan s'inscrit** — se déconnecter → *J'ai 18 ans ou plus* → essayer une date de naissance de 2012 → refusée. Recommencer avec une date majeure et les trois cases cochées → *Vérifier mon âge* (simulation en dev) → arrivée sur le chat.
4. **Préférences** — choisir le ton *taquin*, ajouter un sujet aimé et un tabou (ex. « travail »), un prénom, un safe word (ex. « ananas »). Enregistrer.
5. **Chat** — écrire « Salut, je m'appelle Alex, j'adore le jazz ». Vérifier le streaming, le ton taquin, l'utilisation du prénom. Après quelques échanges, *Préférences → Ce dont elle se souvient* affiche les faits mémorisés.
6. **Refus poli** — écrire une demande explicite : le personnage refuse avec douceur, sans casser le personnage, et propose un autre sujet.
7. **Audio** — cliquer sur **Réponse vocale** sous une réponse : la lecture démarre en streaming, avec la mention « Voix générée par IA ». Recliquer sur la même réponse → servie depuis le cache (en-tête `X-Cache: HIT`).
8. **Vidéo** — cliquer sur **Réponse vidéo** : état « Elle se prépare… » (polling), puis lecture avec la mention « Généré par IA ». Test du repli : mettre une URL d'avatar invalide → message d'erreur puis **audio automatiquement**.
9. **Safe word / Stop** — pendant une réponse, cliquer sur **STOP** : le texte s'arrête net et le son se coupe. Taper ensuite le safe word : réponse fixe « Message reçu… », puis **Effacer le contexte récent**.
10. **Consentement** — *Préférences* → désactiver le consentement → le chat affiche « Consentement retiré ». Le réactiver.
11. **Modération créateur** — en créateur : *Fans* → le fan apparaît avec ses signalements → ouvrir la conversation (déchiffrée) → **Bannir** → côté fan, accès suspendu. Réintégrer.
12. **RGPD** — en fan : *Mes données* → télécharger l'export JSON → taper `SUPPRIMER` → **Tout supprimer** : compte, messages, mémoire Redis et journaux associés sont effacés.

---

## Production

- Définir `AGE_VERIFICATION_MODE=stripe` et configurer le webhook Stripe Identity.
- `ENCRYPTION_KEY` et `REDIS_URL` obligatoires (plusieurs instances ⇒ Redis pour le bouton Stop et la mémoire).
- Stocker le cache audio (`.cache/tts`) sur un volume persistant ou le remplacer par un stockage objet.
- Les URLs vidéo D-ID sont signées et expirent : elles sont gardées 12 h en cache.
- La modération par mots-clés est volontairement conservatrice ; ajustez `lib/moderation.ts` selon vos retours et gardez une revue humaine des signalements.
