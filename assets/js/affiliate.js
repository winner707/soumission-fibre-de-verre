/* ==========================================================================
   Affiliation Amazon — page « Outils et matériaux »
   1. Un seul endroit à remplir : les identifiants Partenaire Amazon
   2. Les liens sont écrits en dur dans le HTML (ils fonctionnent sans JS) ;
      ce fichier ne fait qu'y ajouter la balise d'affiliation et la boutique
      choisie par le visiteur.
   3. Aucun prix n'est affiché : Amazon l'interdit hors API Product Advertising.
   ========================================================================== */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     1. CONFIGURATION — tout se règle ici, rien ailleurs.
        Laissez une valeur vide ('') pour désactiver la fonction.
     ══════════════════════════════════════════════════════════════ */
  var CONFIG = {

    /* Identifiant Partenaire Amazon (« tracking ID »), format 'quelquechose-20'
       pour amazon.ca, 'quelquechose-21' pour amazon.fr.
       Se trouve dans affiliate-program.amazon.ca -> votre compte -> Gérer vos
       identifiants de suivi. Un identifiant par boutique : celui du Canada ne
       paie RIEN sur amazon.fr, et inversement.
       Tant qu'un champ est vide, le lien part quand même vers Amazon,
       simplement sans commission. */
    stores: {
      ca: { host: 'https://www.amazon.ca', tag: '', label: 'amazon.ca' },
      fr: { host: 'https://www.amazon.fr', tag: '', label: 'amazon.fr' }
    },

    /* Boutique proposée par défaut : 'ca' (Canada) ou 'fr' (France / Maghreb). */
    defaultStore: 'ca'
  };

  var STORE_KEY = 'funnel-store';
  var LANG_KEY = 'funnel-lang';

  function store(id) {
    return CONFIG.stores[id] || CONFIG.stores[CONFIG.defaultStore];
  }

  function currentLang() {
    return document.documentElement.getAttribute('lang') === 'en-CA' ? 'en' : 'fr';
  }

  /* ══════════════════════════════════════════════════════════════
     2. CONSTRUCTION DES LIENS
        - data-asin-ca / data-asin-fr : fiche produit précise, si vous en
          avez choisi une (c'est ce qui convertit le mieux) ;
        - data-q / data-q-en : sinon, une recherche Amazon sur des mots-clés.
          Une recherche ne meurt jamais, contrairement à une fiche retirée
          du catalogue.
     ══════════════════════════════════════════════════════════════ */
  function buildUrl(el, storeId) {
    var s = store(storeId);
    var asin = el.getAttribute('data-asin-' + storeId);
    var url;

    if (asin) {
      url = s.host + '/dp/' + encodeURIComponent(asin);
    } else {
      var q = el.getAttribute('data-q-' + currentLang()) || el.getAttribute('data-q') || '';
      url = s.host + '/s?k=' + encodeURIComponent(q);
    }

    if (s.tag) url += (url.indexOf('?') === -1 ? '?' : '&') + 'tag=' + encodeURIComponent(s.tag);
    return url;
  }

  function applyStore(storeId) {
    if (!CONFIG.stores[storeId]) storeId = CONFIG.defaultStore;

    document.querySelectorAll('a[data-aff]').forEach(function (a) {
      a.setAttribute('href', buildUrl(a, storeId));
      /* Exigé par Amazon et par Google : un lien rémunéré doit être déclaré. */
      a.setAttribute('rel', 'sponsored nofollow noopener');
      a.setAttribute('target', '_blank');
    });

    document.querySelectorAll('.store button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.store === storeId));
    });

    document.querySelectorAll('[data-store-label]').forEach(function (el) {
      el.textContent = store(storeId).label;
    });

    document.documentElement.setAttribute('data-store', storeId);
    try { localStorage.setItem(STORE_KEY, storeId); } catch (e) {}
  }

  function initStore() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) {}

    var qs = new URLSearchParams(location.search).get('store');
    applyStore(stored || (CONFIG.stores[qs] ? qs : null) || CONFIG.defaultStore);

    document.querySelectorAll('.store button').forEach(function (b) {
      b.addEventListener('click', function () { applyStore(b.dataset.store); });
    });

    /* Le changement de langue est géré par main.js : on se contente de
       réécrire les mots-clés de recherche quand l'attribut lang bouge. */
    if ('MutationObserver' in window) {
      new MutationObserver(function () {
        applyStore(document.documentElement.getAttribute('data-store'));
      }).observe(document.documentElement, { attributes: true, attributeFilter: ['lang'] });
    }
  }

  /* ══════════════════════════════════════════════════════════════
     3. MESURE — quel produit fait réellement sortir les visiteurs.
        gtag est chargé par main.js, et uniquement si CONFIG.ga4 y est rempli.
     ══════════════════════════════════════════════════════════════ */
  function initTracking() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest ? e.target.closest('a[data-aff]') : null;
      if (!a) return;
      try {
        if (typeof window.gtag === 'function') {
          window.gtag('event', 'affiliate_click', {
            item_name: a.getAttribute('data-aff'),
            item_category: a.getAttribute('data-aff-cat') || '',
            store: document.documentElement.getAttribute('data-store'),
            language: currentLang()
          });
        }
      } catch (err) {
        // La mesure ne doit jamais empêcher un clic de partir.
        console.warn('Clic affilié non mesuré : ' + err);
      }
    });
  }

  /* ══════════════════════════════════════════════════════════════
     4. GARDE-FOU — un rappel visible en console tant que rien ne rapporte.
     ══════════════════════════════════════════════════════════════ */
  function warnIfUnpaid() {
    var paid = Object.keys(CONFIG.stores).some(function (k) { return !!CONFIG.stores[k].tag; });
    if (!paid) {
      console.info(
        'Affiliation Amazon : aucun identifiant Partenaire n\'est encore en place. ' +
        'Les liens fonctionnent mais ne rapportent rien. ' +
        'À remplir dans assets/js/affiliate.js -> CONFIG.stores (voir AFFILIATE.md).'
      );
    }
  }

  /* ══════════════════════════════════════════════════════════════ */
  function boot() {
    if (!document.querySelector('a[data-aff]')) return;
    initStore();
    initTracking();
    warnIfUnpaid();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Repli : si main.js n'est pas chargé sur la page, la langue reste celle
     stockée par le funnel. On ne duplique pas la logique bilingue. */
  try {
    if (!document.querySelector('script[src*="main.js"]')) {
      var l = localStorage.getItem(LANG_KEY);
      if (l === 'en') document.documentElement.setAttribute('lang', 'en-CA');
    }
  } catch (e) {}
})();
