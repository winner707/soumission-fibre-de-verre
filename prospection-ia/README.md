# Prospection IA — outils des semaines 1 à 4

Des agents Claude qui préparent ta prospection d'agences B2B pour l'offre **Pipeline 90**
(1 500 $ de mise en place, 997 $/mois, 15 rendez-vous garantis en 90 jours).

L'outil **prépare**. C'est **toi qui envoies**, à la main, depuis ton courriel. C'est voulu :
- en semaines 1 à 4, on valide l'offre, on ne construit pas d'infrastructure d'envoi ;
- tu relis chaque message avant qu'il parte (règle LCAP : adresse publiée par l'entreprise, lien avec le rôle, option de retrait) ;
- l'envoi automatique arrive en semaine 7, une fois que les messages ont prouvé qu'ils obtiennent des réponses.

## Les agents

| Agent / skill du plan | Commande | Ce qu'il fait |
|---|---|---|
| Agent Prospection | `generer` | Lit le site de l'agence, écrit une séquence cadeau de 3 courriels pour **leurs** clients, ton message au dirigeant et une note LinkedIn |
| Skill Nurturing + Closing | `repondre` | Classe une réponse reçue (intéressé, pas maintenant, objection, refus, désabonnement), propose la réponse et planifie la relance |
| Agent Validation | `appel` | Transforme tes notes d'appel de découverte en douleur, citation, budget, score d'achat et verdict sur l'hypothèse |
| Tableau de bord | `stats` | Entonnoir et écart avec les cibles du plan (100 envois et 8 appels au 28 sept., 2 clients au 5 oct., etc.) |

## Installation sur Windows (15 minutes, une seule fois)

1. **Python** : télécharge-le sur https://www.python.org/downloads/ et lance l'installation.
   **Coche la case « Add python.exe to PATH »** en bas de la première fenêtre, sinon rien ne marchera.
2. **Le programme** : sur GitHub, ouvre le dépôt `soumission-fibre-de-verre`, choisis la branche
   `claude/saas-ia-prospection-plan-dxqplf`, puis **Code → Download ZIP**. Décompresse le ZIP.
3. **Ouvre un terminal dans le bon dossier** : ouvre le dossier `prospection-ia` dans l'Explorateur,
   clique dans la barre d'adresse en haut, tape `cmd` et appuie sur Entrée. Une fenêtre noire s'ouvre.
4. **Colle ces commandes**, une à la fois (Entrée après chacune) :

```bat
python -m pip install -r requirements.txt
setx ANTHROPIC_API_KEY "sk-ant-ta-cle-ici"
copy data\prospects_exemple.csv data\prospects.csv
```

5. **Ferme la fenêtre noire et rouvres-en une** (étape 3) : la clé n'est prise en compte que dans une nouvelle fenêtre.
6. Vérifie : `python -m pia stats` doit afficher ton tableau de bord.

Si `python` n'est pas reconnu, remplace-le par `py` dans toutes les commandes.

Sur Mac : même chose dans l'app Terminal, avec `python3`, `export ANTHROPIC_API_KEY="sk-ant-..."`
et `cp data/prospects_exemple.csv data/prospects.csv`.

**La clé API** : crée-la sur https://console.anthropic.com (Billing : ajoute 20 $ ; API Keys : Create Key).
Compte environ 0,10 à 0,20 $ par prospect préparé. Ne la partage avec personne.

**Le fichier des prospects** : `data/prospects.csv` s'ouvre dans **Excel**. Ajoute une agence par ligne et enregistre
en gardant le format CSV. Le programme lit aussi bien les virgules que les points-virgules d'Excel en français.
Ce fichier contient des données personnelles : il est exclu de Git et ne doit jamais être publié.

## La routine quotidienne (2 h sur tes 4 h)

**1. Remplir le fichier (30 min).** Ajoute 30 agences dans `data/prospects.csv` (Google Maps « agence marketing Montréal »,
Clutch.co, annuaires des chambres de commerce). Colonnes obligatoires : `agence`, `site`, `fondateur`, `email`.
`client_exemple` = un client visible sur leur site ; ça rend la séquence cadeau bien plus précise.

**2. Préparer les messages (5 min, l'agent travaille).**

```bash
python -m pia generer -n 30
```

Un fichier par agence apparaît dans `sortie/<date>/`. Les prospects passent au statut `pret`.

**3. Relire et envoyer (60 min).** Ouvre chaque fichier, corrige ce qui sonne faux, colle la séquence cadeau
dans le message ou en pièce jointe, envoie. Puis :

```bash
python -m pia marquer "Nom de l'agence" envoye
```

**4. Traiter les réponses (15 min).**

```bash
python -m pia repondre "Nom de l'agence" "Le texte de sa réponse"
```

**5. Après chaque appel de découverte.** Écris tes notes dans un fichier texte, puis :

```bash
python -m pia appel notes/agence-x.txt --agence "Agence X"
```

**6. Chaque soir.**

```bash
python -m pia stats
```

Si une cible est ratée 7 jours de suite, on change la niche ou le message. Pas dans un mois.

## Statuts

`a_contacter` → `pret` → `envoye` → `repondu` → `appel_reserve` → `appel_fait` → `client`,
et les sorties `pas_maintenant` (avec date de relance), `perdu`, `desabonne` (ne jamais recontacter).

Exemples : `python -m pia marquer "Agence X" appel_reserve`, `python -m pia marquer "Agence X" pas_maintenant --relance 30`.

## Tests

```bash
python -m pytest -q
```

Les tests utilisent un faux client Claude : ils ne coûtent rien et ne nécessitent pas de clé.

## Réglages

- Modèle : `claude-opus-5` par défaut. Pour un autre modèle : `export PIA_MODEL=...`.
- Si Claude décline une requête, le repli automatique (`fallbacks: "default"`) la relance sur un autre modèle.

## Prochaines briques (dans l'ordre du plan)

- **Semaine 4 — Agent Livraison** : la même mécanique, appliquée aux prospects de tes clients (séquences + import dans l'outil d'envoi).
- **Semaine 7 — Agent Automatisation** : import automatique dans Instantly ou Smartlead, brouillons Gmail.
- **Semaine 11** : rapport client du lundi généré automatiquement.
