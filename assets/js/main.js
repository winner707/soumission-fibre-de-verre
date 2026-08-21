/* ==========================================================================
   Funnel de soumission — logique de page
   1. Endpoint Google Apps Script
   2. Bilingue FR / EN
   3. Formulaire en 2 étapes -> Google Sheets + courriel
   ========================================================================== */
(function () {
  'use strict';

  /* ────────────────────────────────────────────────────────────────
     1. CONFIGURATION — LA SEULE LIGNE À MODIFIER
     Collez ici l'URL /exec de l'application web Google Apps Script.
     ──────────────────────────────────────────────────────────────── */
  var ENDPOINT = 'REMPLACER_PAR_VOTRE_URL_APPS_SCRIPT';

  var configured = /^https:\/\/script\.google\.com\/.+\/exec$/.test(ENDPOINT);

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
      if (data.website || (Date.now() - openedAt) < 3000) { succeed(); return; }

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

    function succeed() {
      wrap.classList.add('is-hidden');
      done.classList.add('is-on');
      done.scrollIntoView({ block: 'center', behavior: 'smooth' });
      if (typeof window.gtag === 'function') {
        window.gtag('event', 'generate_lead', { form: 'landing_funnel' });
      }
      window.dispatchEvent(new CustomEvent('funnel:lead'));
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
          else succeed();
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
            .then(function () { busy(false); succeed(); })
            .catch(function () { busy(false); showMsg(t('network')); });
        });
    }
  }

  /* ══════════════════════════════════════════════════════════════ */
  function boot() {
    initLang();
    initHeader();
    initReveal();
    initYear();
    initForm();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
