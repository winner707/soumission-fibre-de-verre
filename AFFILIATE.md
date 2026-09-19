# Affiliation Amazon — mise en route

Le site gagnait de l'argent d'une seule façon : un visiteur remplit le formulaire.
Les autres — l'immense majorité — repartaient sans rien laisser. Cette page-ci leur
donne quelque chose d'utile, et transforme une petite part de ce trafic perdu en
commissions Amazon.

Tout le paramétrage tient dans un seul objet : `assets/js/affiliate.js`, `CONFIG` (lignes 21-32).

---

## 0. Ce qui a été ajouté

| Fichier | Rôle |
|---|---|
| `outils.html` | La page « boîte à outils » : 14 produits, bilingue FR/EN, divulgation en haut et en bas |
| `assets/js/affiliate.js` | Ajoute votre identifiant Partenaire aux liens, gère le choix de boutique, mesure les clics |
| `assets/css/style.css` | Styles `.aff*`, `.store*`, `.disclosure` (fin de fichier, avant le responsive) |
| `index.html` | Une section « En attendant » + un lien en pied de page vers `outils.html` |
| `assets/js/main.js` | Une seule ligne changée : `META` accepte un `window.PAGE_META` par page |

Les liens sont écrits **en dur dans le HTML**. Si JavaScript ne se charge pas, ils
pointent quand même vers Amazon — simplement sans commission. Rien ne casse.

---

## 1. Avant de compter le moindre dollar

- [ ] Compte Partenaires Amazon **Canada** créé : <https://affiliate-program.amazon.ca>
- [ ] Compte Partenaires Amazon **France** créé si vous visez le Maroc : <https://partenaires.amazon.fr>
- [ ] Identifiant de suivi récupéré dans chaque compte (menu **Compte → Gérer vos identifiants de suivi**)
- [ ] Les deux identifiants collés dans `assets/js/affiliate.js`
- [ ] Un clic de test qui arrive bien sur Amazon avec `tag=` dans l'URL
- [ ] `CONFIG.ga4` rempli dans `assets/js/main.js`, sinon aucun clic n'est mesuré

> **Le compte se ferme tout seul** si vous ne réalisez pas **3 ventes admissibles
> dans les 180 jours** suivant l'inscription. Ne créez donc le compte que lorsque
> la page est en ligne et reçoit du trafic — pas avant.

---

## 2. Où coller les identifiants

```js
// assets/js/affiliate.js
stores: {
  ca: { host: 'https://www.amazon.ca', tag: 'votreid-20', label: 'amazon.ca' },
  fr: { host: 'https://www.amazon.fr', tag: 'votreid-21', label: 'amazon.fr' }
},
defaultStore: 'ca'
```

Un identifiant par boutique, et **ils ne sont pas interchangeables** : celui du
Canada se termine par `-20` et ne paie rien sur `amazon.fr` ; celui de France se
termine par `-21`. Un lien mal balisé vous fait travailler gratuitement.

`defaultStore` décide de la boutique proposée à l'arrivée. Le visiteur peut
basculer lui-même, et son choix est retenu (`localStorage`, clé `funnel-store`).
On peut aussi forcer la boutique par l'URL : `outils.html?store=fr`.

---

## 3. Les règles d'Amazon qu'il ne faut pas enfreindre

Ce sont les trois causes habituelles de fermeture de compte.

1. **La divulgation est obligatoire et doit être visible sans défiler.**
   Elle est déjà en place, en haut de `outils.html` et dans le pied de page,
   dans les deux langues. Ne la retirez pas, ne la rapetissez pas.
2. **Aucun prix, aucune note, aucun « meilleur vendeur » recopié.**
   Reprendre un prix hors de l'API Product Advertising est interdit — et de
   toute façon faux trois jours plus tard. La page dit « le prix s'affiche sur
   Amazon », c'est volontaire.
3. **Pas de lien affilié ailleurs que sur le site.**
   Ni dans un courriel, ni dans un PDF de soumission, ni dans un message privé,
   ni derrière un raccourcisseur d'URL. Le site public, uniquement.

Autres points utiles : le cookie dure **24 h** (90 jours seulement si le produit
est mis au panier), la commission dépend de la catégorie — consultez le barème
officiel de votre boutique plutôt qu'un chiffre recopié ici — et vous touchez sur
**tout** ce que la personne achète pendant ces 24 h, pas seulement le produit lié.

---

## 4. Passer d'une recherche à une fiche produit

Par défaut, chaque bouton lance une **recherche Amazon** sur des mots-clés
(`data-q` en français, `data-q-en` en anglais). C'est délibéré : une recherche ne
meurt jamais, alors qu'une fiche produit retirée du catalogue donne une page 404
et un visiteur perdu.

Une fiche précise convertit mieux. Quand vous en avez validé une, ajoutez son
ASIN sur le lien — le reste se fait tout seul :

```html
<a class="btn btn--ghost btn--block" data-aff="coupe-froid"
   data-asin-ca="B0XXXXXXXX" data-asin-fr="B0YYYYYYYY"
   data-q="coupe-froid adhésif EPDM porte fenêtre" ...>
```

L'ASIN se lit dans l'URL du produit (`/dp/B0XXXXXXXX`) ou dans la section
« Détails du produit ». **Il change d'une boutique à l'autre** : vérifiez chaque
ASIN sur la boutique concernée avant de le coller. S'il n'y a pas d'ASIN pour une
boutique, le lien retombe automatiquement sur la recherche.

À revérifier **deux fois par an** : les fiches disparaissent, les vendeurs changent.

---

## 5. Mise en ligne sur Hostinger

Le dépôt entier est déployé dans `public_html` : `outils.html` se retrouve donc à
`https://votredomaine.com/outils.html`, sans configuration supplémentaire.

1. hPanel → **Fichiers → Gestionnaire de fichiers** → `public_html`
   (ou **Avancé → Git** si le déploiement automatique est branché sur ce dépôt).
2. Envoyer `outils.html`, `assets/js/affiliate.js`, `assets/js/main.js`,
   `assets/css/style.css`, `index.html`.
3. hPanel → **Performance → Cache** → **Vider le cache** (LiteSpeed sert
   volontiers l'ancien CSS pendant des heures sinon).
4. Ouvrir `https://votredomaine.com/outils.html` en navigation privée,
   cliquer un bouton, et vérifier que l'URL d'arrivée contient bien `tag=`.

Le `.htaccess` refuse déjà de servir les fichiers `.md` : ce document ne sera pas
public, même déposé dans `public_html`.

---

## 6. Savoir ce qui marche

Si `CONFIG.ga4` est rempli dans `assets/js/main.js`, chaque clic envoie un
événement `affiliate_click` avec le produit, la catégorie, la boutique et la langue.

Dans GA4 : **Rapports → Engagement → Événements → `affiliate_click`**.
Croisez-le avec le rapport de gains d'Amazon (qui, lui, ne vous dira jamais *d'où*
venait le clic). Le but n'est pas d'admirer la courbe : c'est de supprimer les
produits qui ne sont jamais cliqués et d'en ajouter de proches de ceux qui le sont.

---

## 7. Ce qu'il ne faut pas en attendre

L'affiliation sur ce genre de trafic rapporte des dizaines de dollars par mois,
pas des milliers : la catégorie bricolage est parmi les moins bien rémunérées, et
un lead de remplacement de fenêtres vaut plusieurs centaines de dollars. **Le
formulaire reste la priorité absolue.**

C'est pour cette raison que la page renvoie vers la soumission à trois endroits
(en-tête, bouton collant sur mobile, bloc final), et qu'elle dit honnêtement où
s'arrête le bricolage. Une page d'outils qui laisserait croire qu'un film
plastique remplace une fenêtre ferait perdre bien plus qu'elle ne rapporte.
