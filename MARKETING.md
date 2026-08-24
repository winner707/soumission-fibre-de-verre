# Plan de campagne — Canada et Maroc

Document de travail pour lancer le trafic payant vers le funnel.
Tout le paramétrage technique se fait dans `assets/js/main.js`, objet `CONFIG` (lignes 14-42).

---

## 0. Avant de dépenser un seul dollar

- [ ] **`CONFIG.endpoint`** rempli avec l'URL `/exec` — sinon le formulaire refuse d'envoyer
- [ ] Un lead de test arrivé dans le Sheet **et** dans la boîte courriel
- [ ] **`CONFIG.ga4`** rempli — sinon aucune donnée d'audience
- [ ] **`CONFIG.googleAdsConversion`** rempli — sinon Google optimise à l'aveugle
- [ ] Un vrai nom de domaine à la place de `blueviolet-loris-711681.hostingersite.com`

> Tant qu'un identifiant est vide, **aucun script tiers n'est chargé** et aucun cookie n'est posé.
> C'est volontaire : le site reste propre et conforme par défaut.

---

## 1. Structure de compte Google Ads (Canada)

Une seule campagne au départ. Réseau **Recherche uniquement** — décochez « Partenaires du Réseau de Recherche » et « Réseau Display », qui brûlent le budget sans intention.

**Zones :** Grand Montréal + Laval + Montérégie uniquement.
Ciblage : *Présence — Personnes se trouvant régulièrement dans vos zones ciblées*
(pas « personnes intéressées par », qui fait entrer le monde entier).

**Langue :** français + anglais.
**Enchères :** « Maximiser les clics » avec plafond de CPC les 2 premières semaines, puis bascule vers « Maximiser les conversions » une fois **15-20 conversions** enregistrées. Passer en Smart Bidding trop tôt est l'erreur la plus coûteuse.

### Groupe 1 — Fenêtres (intention haute)

```
"remplacement fenetres"
"remplacer fenetres maison"
"changer fenetres"
"soumission fenetres"
"estimation fenetres"
"prix fenetres maison"
"cout remplacement fenetres"
"fenetres fibre de verre"
"compagnie fenetres"
```

### Groupe 2 — Portes

```
"porte entree prix"
"remplacer porte entree"
"soumission porte entree"
"porte patio prix"
"remplacer porte patio"
"porte fibre de verre"
```

### Groupe 3 — Déclencheur énergie

```
"fenetres efficaces energetiquement"
"fenetres energy star"
"reduire facture chauffage fenetres"
"subvention fenetres"
```

> Tout en **expression exacte** (`"..."`) au départ. Le requête large sans historique de
> conversion, c'est financer l'apprentissage de Google avec votre argent.

### Mots-clés négatifs — à poser le jour 1

C'est ce qui fera la différence entre un lead à 60 $ et un lead à 200 $.

```
emploi          carriere        salaire         embauche
reparation      reparer         reparateur      ajustement
moustiquaire    store           rideau          toile
usage           usagee          seconde main    kijiji
gratuit         bricolage       diy             soi meme
location        locataire       condo syndicat
lavage          nettoyage       laveur
film            teinte          pellicule
autocad         dwg             detail technique
grossiste       distributeur    fournisseur
formation       cours           apprendre
definition      wikipedia       histoire
```

À relire **chaque semaine** dans le rapport sur les termes de recherche pendant le premier mois.

### Annonces responsives — titres (30 caractères max)

```
Soumission fenêtres gratuite
Changez vos fenêtres — 2 min
Fenêtres fibre de verre
Prix en 24 h, sans engagement
Moins de chauffage cet hiver
Estimation gratuite en ligne
Portes et fenêtres sur mesure
Ne payez plus pour chauffer
Fibre de verre — à vie
Réponse sous 24 h ouvrables
Sans engagement, 100 % gratuit
Fenêtres qui durent 40 ans
```

### Descriptions (90 caractères max)

```
Décrivez votre projet en 2 minutes. Recevez une soumission détaillée sous 24 h.
La fibre de verre ne gauchit pas, ne fend pas, ne rouille pas. Entretien : zéro.
500 fois moins conductrice que l'aluminium. Votre chauffage le sentira passer.
Gratuit et sans engagement. Vous comparez, vous décidez. Aucune pression.
```

**Extensions à ajouter** (elles augmentent le taux de clic sans coûter plus cher) :
- Liens annexes : *Fenêtres* · *Portes d'entrée* · *Portes-patio* · *Comment ça marche*
- Accroches : *Sans engagement* · *Réponse 24 h* · *Modèles ENERGY STAR* · *Devis détaillé*
- Extrait de site — « Types » : Guillotine, Battants, Coulissante, Auvent, Fixe

---

## 2. Meta (Canada) — en second, pas en premier

À lancer une fois que Google produit des leads, pas avant.

**Audience 1 — reciblage (la plus rentable).** Visiteurs 30 jours qui n'ont pas déclenché `Lead`.
Ce sont les gens partis à l'étape 2 du formulaire. Message : *« Votre soumission vous attend — il vous reste 30 secondes. »*

**Audience 2 — froide.** Propriétaires 35-65 ans, zones ciblées, intérêts rénovation / amélioration de l'habitat.

**Angle créatif qui fonctionne en climat froid :** le problème avant le produit.
Photo d'une fenêtre embuée ou givrée de l'intérieur → *« Si vos fenêtres font ça, vous chauffez la rue. »*

---

## 3. Maroc — phase 2, et pas le même funnel

**Ne lancez pas le Maroc en même temps que le Canada.** Un petit budget divisé en deux
n'atteint le seuil d'apprentissage d'aucune des deux plateformes.

### Ce qui change, obligatoirement

| Élément | Canada | Maroc |
|---|---|---|
| Canal | Google Search d'abord | **Meta uniquement** — la recherche n'existe quasi pas sur cette catégorie |
| Conversion | Formulaire → courriel | **WhatsApp** avant tout |
| Argument | Facture de chauffage, subventions | Esthétique, prestige, tenue au soleil, zéro entretien |
| Format | Image + texte | **Vidéo verticale** |

### WhatsApp : à rebrancher avant de lancer le Maroc

Le bouton WhatsApp et le pixel Meta ont été **retirés du code le 2026-08-24**, à votre
demande, pour garder le site minimal pendant la phase Canada.

Ils sont récupérables tels quels dans le commit `c4c1e84` (`git show c4c1e84`).
À remettre avant toute campagne marocaine : sans WhatsApp, ce marché ne convertit pas.

### Angles créatifs Maroc

1. **Le soleil** — *« Vos fenêtres tiennent-elles l'été ? »* Le PVC ramollit et se déforme
   au-delà de 70 °C en surface. La fibre de verre, non.
2. **Les teintes foncées** — anthracite, noir, bronze en plein sud, là où le PVC est déconseillé.
   Argument très visuel, parfait pour Instagram.
3. **Le prestige** — un produit nord-américain, la finition qui ne jaunit pas.
4. **Le littoral** — Casablanca, Tanger, Agadir : air salin, rien à corroder.

### Qualification

Le coût par lead sera une fraction du canadien, mais la proportion de curieux sera bien plus
élevée. Utilisez la colonne **Quantity** du Sheet pour trier : « 1 à 3 » au Maroc mérite
rarement un suivi manuel, « 9 à 15 » et « 16 et + » oui.

---

## 4. Suivi (UTM)

Le funnel enregistre l'URL complète dans la colonne **Page URL** du Sheet.
Taguez chaque lien et vous saurez exactement quelle campagne paie.

```
https://VOTRE-DOMAINE/?utm_source=google&utm_medium=cpc&utm_campaign=ca-fenetres
https://VOTRE-DOMAINE/?utm_source=meta&utm_medium=paid&utm_campaign=ma-soleil&lang=fr
```

`?lang=en` force l'anglais au chargement — utile pour cibler le Canada anglophone.

---

## 5. Ce qu'il faut regarder, et quand

**Ne touchez à rien pendant 7 jours.** Modifier une campagne tous les jours empêche
l'algorithme de converger et rend les données illisibles.

| Quand | Quoi | Action |
|---|---|---|
| Jour 3 | Termes de recherche | Ajouter des négatifs. Rien d'autre. |
| Jour 7 | Coût par lead | Couper les mots-clés sans conversion ayant dépassé 2× le CPL cible |
| Jour 14 | Taux de complétion étape 1 → 2 | Si < 40 %, le problème est la page, pas la pub |
| Jour 30 | Qualité réelle des leads | Seule mesure qui compte : combien se sont transformés en clients |

Un CPL bas avec zéro client est un échec coûteux. Suivez la qualité, pas le volume.

---

## 6. Ce qui manque encore sur la page

Par ordre d'impact sur le taux de conversion :

1. **Preuve sociale** — aucun témoignage, aucun projet réalisé, aucun chiffre de clients.
   C'est le plus gros levier restant, surtout au Maroc.
2. **Nom de domaine réel** — une adresse `hostingersite.com` dans une pub payante coûte
   des clics et de la crédibilité.
3. **Politique de confidentialité** — le formulaire collecte des données personnelles.
   Au Québec, la **Loi 25** l'exige.
