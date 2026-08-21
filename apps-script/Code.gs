/**
 * ============================================================================
 *  Funnel de soumission — reception des leads
 *  Ecrit chaque demande dans Google Sheets ET envoie une alerte courriel.
 *
 *  INSTALLATION
 *    1. Google Sheet -> Extensions -> Apps Script
 *    2. Coller ce fichier en entier
 *    3. Executer  setupSheet  une fois (autoriser l'acces)
 *    4. Deployer -> Nouveau deploiement -> Application Web
 *         Executer en tant que : Moi
 *         Qui a acces          : Tout le monde
 *    5. Copier l'URL /exec dans assets/js/main.js (ENDPOINT, ligne 13)
 * ============================================================================
 */

/* ─────────────────────────────  CONFIGURATION  ───────────────────────────── */

/** Vide si le script est lie a la feuille (Extensions -> Apps Script). */
var SHEET_ID = '';

/** Onglet qui recoit les demandes. Cree automatiquement. */
var SHEET_NAME = 'Leads';

/** Qui recoit une alerte a chaque nouvelle demande. */
var NOTIFY_EMAILS = ['otmatechinc@gmail.com'];

/**
 * Domaines autorises a soumettre. Vide = aucune restriction.
 * A remplir avec le domaine final une fois le site en ligne, par ex. :
 *   ['votre-site.hostingersite.com']
 */
var ALLOWED_HOSTS = [];

var HEADERS = [
  'Timestamp',
  'Full Name',
  'Email',
  'Phone Number',
  'Province/Region',
  'Project Type',
  'Quantity',
  'Message',
  'Source',
  'Language',
  'Page URL'
];

/* ─────────────────────────────  POINTS D'ENTREE  ──────────────────────────── */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var d = parsePayload(e);

    // Pot de miel : rempli par un robot -> on ignore silencieusement.
    if (d.website) return json({ ok: true, skipped: 'honeypot' });

    if (ALLOWED_HOSTS.length && d.pageUrl) {
      var host = String(d.pageUrl).replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
      if (ALLOWED_HOSTS.indexOf(host) === -1) {
        return json({ ok: false, error: 'Origine non autorisee.' });
      }
    }

    if (!String(d.fullName || '').trim()) {
      return json({ ok: false, error: 'Nom manquant.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(d.email || '').trim())) {
      return json({ ok: false, error: 'Adresse courriel invalide.' });
    }

    var sheet = getSheet();
    sheet.appendRow(buildRow(d));

    try { notify(d); } catch (mailErr) { console.warn('Alerte non envoyee : ' + mailErr); }

    return json({ ok: true, row: sheet.getLastRow() });

  } catch (err) {
    console.error(err);
    return json({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    try { lock.releaseLock(); } catch (ignored) {}
  }
}

/** Ouvrir l'URL /exec dans un navigateur : test de vie du deploiement. */
function doGet() {
  var sheet = getSheet();
  return json({
    ok: true,
    service: 'Funnel lead capture',
    sheet: sheet.getName(),
    rows: Math.max(0, sheet.getLastRow() - 1),
    time: new Date().toISOString()
  });
}

/* ────────────────────────────────  OUTILS  ────────────────────────────────── */

function parsePayload(e) {
  if (e && e.postData && e.postData.contents) {
    try { return JSON.parse(e.postData.contents); } catch (ignored) {}
  }
  return (e && e.parameter) ? e.parameter : {};
}

function buildRow(d) {
  var c = function (v) { return String(v == null ? '' : v).trim().slice(0, 3000); };
  return [
    new Date(),
    c(d.fullName),
    c(d.email),
    c(d.phone),
    c(d.region),
    c(d.projectType),
    c(d.quantity),
    c(d.message),
    c(d.source) || 'Landing Funnel',
    c(d.language) || 'FR',
    c(d.pageUrl)
  ];
}

function getSheet() {
  var ss = SHEET_ID ? SpreadsheetApp.openById(SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error('Aucune feuille trouvee. Liez le script a un Google Sheet ou renseignez SHEET_ID.');
  }
  var sheet = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
  if (sheet.getLastRow() === 0) writeHeaders(sheet);
  return sheet;
}

function writeHeaders(sheet) {
  sheet.getRange(1, 1, 1, HEADERS.length)
    .setValues([HEADERS])
    .setFontWeight('bold')
    .setBackground('#17805A')
    .setFontColor('#FFFFFF')
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 34);
  sheet.setFrozenRows(1);
}

function notify(d) {
  if (!NOTIFY_EMAILS.length) return;

  var body =
    'NOUVELLE DEMANDE DE SOUMISSION\n' +
    '--------------------------------------------\n' +
    'Nom          : ' + (d.fullName || '') + '\n' +
    'Courriel     : ' + (d.email || '') + '\n' +
    'Telephone    : ' + (d.phone || 'non fourni') + '\n' +
    'Region       : ' + (d.region || '') + '\n' +
    'Projet       : ' + (d.projectType || '') + '\n' +
    'Ouvertures   : ' + (d.quantity || '') + '\n' +
    'Langue       : ' + (d.language || 'FR') + '\n' +
    'Page         : ' + (d.pageUrl || '') + '\n\n' +
    'Message :\n' + (d.message || '(aucun)') + '\n';

  MailApp.sendEmail({
    to: NOTIFY_EMAILS.join(','),
    subject: 'Nouvelle soumission — ' + (d.fullName || 'sans nom') + ' (' + (d.projectType || '?') + ')',
    body: body,
    replyTo: String(d.email || '').trim() || undefined
  });
}

function json(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ──────────────────────  A EXECUTER MANUELLEMENT UNE FOIS  ────────────────── */

/** Prepare la feuille : en-tetes, mise en forme, largeurs de colonnes. */
function setupSheet() {
  var sheet = getSheet();
  writeHeaders(sheet);

  var widths = [150, 170, 220, 140, 200, 150, 110, 380, 150, 90, 240];
  widths.forEach(function (w, i) { sheet.setColumnWidth(i + 1, w); });

  sheet.getRange(2, 1, Math.max(sheet.getMaxRows() - 1, 1), HEADERS.length)
    .setVerticalAlignment('top')
    .setWrap(true);

  sheet.getRange('A:A').setNumberFormat('yyyy-mm-dd hh:mm:ss');
  Logger.log('Feuille "%s" prete.', sheet.getName());
}

/** Insere une demande fictive pour verifier toute la chaine. */
function testAppend() {
  var fake = {
    postData: {
      contents: JSON.stringify({
        fullName: 'Test — Marie Tremblay',
        email: 'test@exemple.ca',
        phone: '(450) 555-0123',
        region: 'Lanaudiere',
        projectType: 'Fenetres',
        quantity: '4 a 8',
        message: 'Test automatique. Vous pouvez supprimer cette ligne.',
        source: 'Landing Funnel',
        language: 'FR',
        pageUrl: 'https://exemple.com/'
      })
    }
  };
  Logger.log(doPost(fake).getContent());
}
