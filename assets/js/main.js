/* ==========================================================================
   Funnel de soumission — logique de page
   1. Endpoint Google Apps Script
   2. Bilingue FR / EN
   3. Formulaire en 2 étapes -> Google Sheets + courriel
   ========================================================================== */
(function () {
  'use strict';

  /* ══════════════════════════════════════════════════════════════
     1. CONFIGURATION — tout se règle ici, rien ailleurs.
        Laissez une valeur vide ('') pour désactiver la fonction.
     ══════════════════════════════════════════════════════════════ */
  var CONFIG = {

    /* URL /exec de l'application web Google Apps Script.
       Sans elle, le formulaire refuse d'envoyer. */
    endpoint: 'REMPLACER_PAR_VOTRE_URL_APPS_SCRIPT',

    /* Identifiant de mesure Google Analytics 4 — format 'G-XXXXXXXXXX'.
       Se trouve dans GA4 : Admin -> Flux de données -> votre flux web. */
    ga4: '',

    /* Identifiant du pixel Meta (Facebook / Instagram) — que des chiffres.
       Se trouve dans le Gestionnaire d'événements Meta. */
    metaPixel: '',

    /* Étiquette de conversion Google Ads — format 'AW-123456789/AbC-D_efGh'.
       Se trouve dans Google Ads : Objectifs -> Conversions -> votre action. */
    googleAdsConversion: '',

    /* Numéro WhatsApp au format international, chiffres uniquement,
       sans + ni espaces. Ex. Maroc : '2126XXXXXXXX'.
       Rempli = un bouton WhatsApp flottant apparaît. Vide = rien. */
    whatsapp: '',

    /* Message pré-rempli dans WhatsApp, par langue. */
    whatsappText: {
      fr: "Bonjour, j'aimerais une soumission pour des portes et fenêtres en fibre de verre.",
      en: 'Hello, I would like a quote for fiberglass doors and windows.'
    }
  };

  var configured = /^https:\/\/script\.google\.com\/.+\/exec$/.test(CONFIG.endpoint);
  var ENDPOINT = CONFIG.endpoint;

  /* ══════════════════════════════════════════════════════════════
     2. BILINGUE
     ══════════════════════════════════════════════════════════════ */
  var KEY = 'funnel-lang';

  var META = {
    fr: {
      title: 'Soumission gratuite — Portes et fenêtres en fibre de verre',
      desc: "Obtenez une soumission gratuite pour des portes et fenêtres en fibre de verre : moins de chauffage, aucun entretien, une durée de vie exceptionnelle. Réponse sous 24 h, sans engagement."
    },
    en: {
      title: 'Free quote — Fiberglass doors and windows',
      desc: 'Get a free quote for fiberglass doors and windows: less heating, zero upkeep, exceptional service life. Answer within 24 h, no obligation.'
    }
  };

  function applyLang(lang) {
    if (lang !== 'fr' && lang !== 'en') lang = 'fr';
    document.documentElement.setAttribute('lang', lang === 'fr' ? 'fr-CA' : 'en-CA');

    document.querySelectorAll('[data-fr][data-en]').forEach(function (el) {
      var v = el.getAttribute('data-' + lang);
      if (v === null) return;
      if (el.tagName === 'OPTION') el.textContent = v;
      else el.innerHTML = v;
    });

    document.querySelectorAll('[data-fr-label][data-en-label]').forEach(function (el) {
      el.setAttribute('label', el.getAttribute('data-' + lang + '-label'));
    });

    document.querySelectorAll('[data-fr-ph][data-en-ph]').forEach(function (el) {
      el.setAttribute('placeholder', el.getAttribute('data-' + lang + '-ph'));
    });

    document.title = META[lang].title;
    var d = document.querySelector('meta[name="description"]');
    if (d) d.setAttribute('content', META[lang].desc);

    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });

    try { localStorage.setItem(KEY, lang); } catch (e) {}
  }

  function lang() {
    return document.documentElement.getAttribute('lang') === 'en-CA' ? 'en' : 'fr';
  }

  function initLang() {
    var stored = null;
    try { stored = localStorage.getItem(KEY); } catch (e) {}
    var qs = new URLSearchParams(location.search).get('lang');
    applyLang(stored || (qs === 'en' || qs === 'fr' ? qs : null) || 'fr');

    document.querySelectorAll('.lang button').forEach(function (b) {
      b.addEventListener('click', function () { applyLang(b.dataset.lang); });
    });
  }

  /* ══════════════════════════════════════════════════════════════
     3. INTERFACE
     ══════════════════════════════════════════════════════════════ */
  function initHeader() {
    var h = document.getElementById('header');
    if (!h) return;
    var f = function () { h.classList.toggle('is-stuck', window.scrollY > 8); };
    f();
    window.addEventListener('scroll', f, { passive: true });
  }

  function initReveal() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    items.forEach(function (el) { io.observe(el); });
  }

  function initYear() {
    var y = document.getElementById('year');
    if (y) y.textContent = String(new Date().getFullYear());
  }

  /* ══════════════════════════════════════════════════════════════
     3 bis. MESURE — GA4, pixel Meta, conversion Google Ads
     Rien n'est chargé tant que l'identifiant correspondant est vide,
     donc aucune requête tierce et aucun cookie par défaut.
     ══════════════════════════════════════════════════════════════ */
  function loadScript(src) {
    var s = document.createElement('script');
    s.async = true;
    s.src = src;
    document.head.appendChild(s);
  }

  function initTracking() {
    var needsGtag = CONFIG.ga4 || CONFIG.googleAdsConversion;

    if (needsGtag) {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());

      // L'identifiant du chargeur peut être GA4 ou Google Ads, peu importe :
      // gtag.js accepte ensuite une config par produit.
      var loaderId = CONFIG.ga4 || CONFIG.googleAdsConversion.split('/')[0];
      loadScript('https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(loaderId));

      if (CONFIG.ga4) window.gtag('config', CONFIG.ga4);
      if (CONFIG.googleAdsConversion) {
        window.gtag('config', CONFIG.googleAdsConversion.split('/')[0]);
      }
    }

    if (CONFIG.metaPixel) {
      /* Extrait officiel du pixel Meta, réécrit lisiblement. */
      var fbq = window.fbq = function () {
        fbq.callMethod ? fbq.callMethod.apply(fbq, arguments) : fbq.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = fbq;
      fbq.push = fbq;
      fbq.loaded = true;
      fbq.version = '2.0';
      fbq.queue = [];
      loadScript('https://connect.facebook.net/en_US/fbevents.js');
      window.fbq('init', CONFIG.metaPixel);
      window.fbq('track', 'PageView');
    }
  }

  /** Appelée une seule fois, quand une demande part réellement. */
  function trackLead(data) {
    try {
      if (typeof window.gtag === 'function') {
        if (CONFIG.ga4) {
          window.gtag('event', 'generate_lead', {
            project_type: data.projectType,
            quantity: data.quantity,
            region: data.region,
            language: data.language
          });
        }
        if (CONFIG.googleAdsConversion) {
          window.gtag('event', 'conversion', { send_to: CONFIG.googleAdsConversion });
        }
      }
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'Lead', { content_category: data.projectType });
      }
    } catch (e) {
      // La mesure ne doit jamais casser l'envoi d'un lead.
      console.warn('Tracking non envoyé : ' + e);
    }
    window.dispatchEvent(new CustomEvent('funnel:lead', { detail: data }));
  }

  /* ══════════════════════════════════════════════════════════════
     3 ter. WHATSAPP — indispensable au Maroc, inutile sans numéro
     ══════════════════════════════════════════════════════════════ */
  function initWhatsApp() {
    if (!/^\d{8,15}$/.test(CONFIG.whatsapp)) return;

    var a = document.createElement('a');
    a.className = 'wa';
    a.target = '_blank';
    a.rel = 'noopener';
    a.setAttribute('aria-label', 'WhatsApp');
    a.innerHTML =
      '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
      '<path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm5.8 14.2c-.2.7-1.4 1.3-2 1.4-.5.1-1.1.1-1.8-.1-.4-.1-1-.3-1.7-.6-3-1.3-4.9-4.3-5-4.5-.2-.2-1.2-1.6-1.2-3s.7-2.1 1-2.4c.2-.3.5-.4.7-.4h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.4 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.8 1.3 1.7 2.1 1.2 1 2.1 1.4 2.4 1.5.3.1.5.1.6-.1l.9-1c.2-.2.4-.2.6-.1l2 .9c.2.1.4.2.4.3.1.1.1.6-.1 1.3Z"/>' +
      '</svg>';

    function refresh() {
      var msg = CONFIG.whatsappText[lang()] || CONFIG.whatsappText.fr;
      a.href = 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(msg);
    }
    refresh();
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.addEventListener('click', refresh);
    });

    a.addEventListener('click', function () {
      if (typeof window.gtag === 'function' && CONFIG.ga4) {
        window.gtag('event', 'contact', { method: 'whatsapp' });
      }
      if (typeof window.fbq === 'function') window.fbq('track', 'Contact');
    });

    document.body.appendChild(a);
    document.body.classList.add('has-wa');
  }

  /* ══════════════════════════════════════════════════════════════
     4. FORMULAIRE
     ══════════════════════════════════════════════════════════════ */
  var T = {
    fr: {
      project:  'Choisissez ce que vous souhaitez remplacer.',
      qty:      "Indiquez le nombre approximatif d'ouvertures.",
      region:   'Sélectionnez votre région.',
      name:     'Entrez votre nom complet.',
      email:    'Cette adresse courriel ne semble pas valide.',
      offline:  "Le formulaire n'est pas encore connecté. Réessayez dans quelques instants.",
      network:  "L'envoi a échoué. Vérifiez votre connexion et réessayez.",
      sending:  'Envoi…'
    },
    en: {
      project:  'Choose what you want to replace.',
      qty:      'Tell us roughly how many openings.',
      region:   'Select your region.',
      name:     'Enter your full name.',
      email:    "That email address doesn't look valid.",
      offline:  "The form isn't connected yet. Please try again shortly.",
      network:  'Sending failed. Check your connection and try again.',
      sending:  'Sending…'
    }
  };

  /** Groupe de boutons à choix unique. */
  function initPicks(id) {
    var group = document.getElementById(id);
    if (!group) return;
    group.addEventListener('click', function (e) {
      var btn = e.target.closest('.pick');
      if (!btn) return;
      group.querySelectorAll('.pick').forEach(function (b) {
        b.setAttribute('aria-pressed', String(b === btn));
      });
      hideMsg();
    });
  }

  function pickedValue(id) {
    var el = document.querySelector('#' + id + ' .pick[aria-pressed="true"]');
    if (!el) return '';
    // La valeur enregistrée suit la langue affichée au moment de l'envoi.
    return lang() === 'en' ? (el.dataset.valueEn || el.dataset.value) : el.dataset.value;
  }

  var msgEl;
  function showMsg(text) {
    msgEl.textContent = text;
    msgEl.classList.add('is-on');
  }
  function hideMsg() {
    if (!msgEl) return;
    msgEl.textContent = '';
    msgEl.classList.remove('is-on');
  }

  function initForm() {
    var form = document.getElementById('leadForm');
    if (!form) return;

    msgEl = document.getElementById('formMsg');

    var wrap   = document.getElementById('formWrap');
    var done   = document.getElementById('formDone');
    var step1  = document.getElementById('step1');
    var step2  = document.getElementById('step2');
    var bar2   = document.getElementById('bar2');
    var btn    = document.getElementById('submitBtn');
    var label  = document.getElementById('submitLabel');
    var openedAt = Date.now();

    function t(k) { return T[lang()][k]; }

    initPicks('pickProject');
    initPicks('pickQty');

    /* ---------- Étape 1 -> 2 ---------- */
    document.getElementById('next1').addEventListener('click', function () {
      hideMsg();
      if (!pickedValue('pickProject')) return showMsg(t('project'));
      if (!pickedValue('pickQty'))     return showMsg(t('qty'));
      if (!form.region.value)          { showMsg(t('region')); form.region.focus(); return; }

      step1.classList.remove('is-on');
      step2.classList.add('is-on');
      bar2.classList.add('is-on');
      document.getElementById('f_name').focus();
    });

    document.getElementById('back2').addEventListener('click', function () {
      hideMsg();
      step2.classList.remove('is-on');
      step1.classList.add('is-on');
      bar2.classList.remove('is-on');
    });

    /* ---------- Envoi ---------- */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      hideMsg();

      var data = {
        fullName:    form.fullName.value.trim(),
        email:       form.email.value.trim(),
        phone:       form.phone.value.trim(),
        region:      form.region.value.trim(),
        projectType: pickedValue('pickProject'),
        quantity:    pickedValue('pickQty'),
        message:     form.message.value.trim(),
        source:      'Landing Funnel',
        language:    lang().toUpperCase(),
        pageUrl:     location.href,
        website:     form.website.value
      };

      if (!data.fullName) { showMsg(t('name')); form.fullName.focus(); return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(data.email)) {
        showMsg(t('email')); form.email.focus(); return;
      }

      // Anti-spam : pot de miel rempli, ou envoi en moins de 3 s.
      if (data.website || (Date.now() - openedAt) < 3000) { succeed(data, false); return; }

      if (!configured) { showMsg(t('offline')); return; }

      busy(true);
      send(data);
    });

    function busy(on) {
      btn.disabled = on;
      if (on) {
        label.dataset.restore = label.innerHTML;
        label.innerHTML = '<span class="spinner" aria-hidden="true"></span>' + t('sending');
      } else if (label.dataset.restore) {
        label.innerHTML = label.dataset.restore;
        delete label.dataset.restore;
      }
    }

    /** track = false pour les robots : on leur montre l'écran de succès
        sans polluer les conversions payantes. */
    function succeed(data, track) {
      wrap.classList.add('is-hidden');
      done.classList.add('is-on');
      done.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (track !== false) trackLead(data || {});
    }

    function send(data) {
      /* Content-Type « text/plain » = requête simple : pas de préflight CORS,
         qu'Apps Script ne sait pas traiter. Le serveur reçoit bien du JSON. */
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(data),
        redirect: 'follow'
      })
        .then(function (r) { return r.json().catch(function () { return { ok: r.ok }; }); })
        .then(function (j) {
          busy(false);
          if (j && j.ok === false) showMsg(j.error || t('network'));
          else succeed(data);
        })
        .catch(function () {
          /* Repli : si le navigateur refuse de lire la réponse, on renvoie en
             « no-cors ». La ligne est écrite, mais le résultat est illisible. */
          fetch(ENDPOINT, {
            method: 'POST',
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(data)
          })
            .then(function () { busy(false); succeed(data); })
            .catch(function () { busy(false); showMsg(t('network')); });
        });
    }
  }

  /* ══════════════════════════════════════════════════════════════ */
  function boot() {
    initLang();
    initTracking();
    initHeader();
    initReveal();
    initYear();
    initForm();
    initWhatsApp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
