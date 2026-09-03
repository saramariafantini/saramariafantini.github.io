/**
 * Sincronizzazione automatica dell'agenda concerti di Sara Maria Fantini.
 *
 * QUESTO FILE NON VIENE ESEGUITO DAL SITO. È una copia di riferimento,
 * salvata nel repository per documentazione. Il codice vero gira dentro
 * Google Apps Script, agganciato al foglio Google dell'agenda.
 *
 * COSA FA
 * Ogni giorno legge il foglio Google dell'agenda e pubblica una copia
 * dei dati come agenda-data.json in questo repository, tramite le API
 * di GitHub. Il sito (pages/agenda-it/en/fr.html) legge quel file invece
 * di contattare Google Sheets direttamente dal browser del visitatore —
 * questo evita che reti aziendali che bloccano docs.google.com
 * impediscano il caricamento dell'agenda.
 *
 * COME INSTALLARLO (una tantum)
 * 1. Apri il foglio Google dell'agenda di Sara.
 * 2. Menu Estensioni → Apps Script.
 * 3. Sezione "File" a sinistra → "+" → Script — chiamalo ad es.
 *    "agenda-sync" e incolla lì dentro tutto questo codice.
 * 4. Icona ingranaggio "Impostazioni progetto" (barra laterale sinistra)
 *    → sezione "Proprietà script" → Aggiungi proprietà script:
 *      Nome:  GITHUB_TOKEN
 *      Valore: <un Personal Access Token GitHub fine-grained, con
 *               permesso "Contents: Read and write" limitato al solo
 *               repo saramariafantini/saramariafantini.github.io>
 * 5. Icona orologio "Trigger" (barra laterale sinistra) → Aggiungi trigger:
 *      Funzione da eseguire: pushAgendaToGitHub
 *      Origine evento: Basato sul tempo
 *      Tipo di trigger basato sul tempo: Timer giornaliero
 *      Ora: scegli una fascia (es. 03:00–04:00)
 * 6. Prima di salvare il trigger, esegui la funzione una volta a mano:
 *    seleziona "pushAgendaToGitHub" dal menu a tendina in alto ed esegui.
 *    Al primo avvio Google chiederà di autorizzare lo script (accesso
 *    al foglio e a servizi esterni): concedi l'autorizzazione.
 * 7. Controlla che il file agenda-data.json nel repository GitHub si
 *    sia aggiornato con i dati del foglio.
 *
 * Da quel momento in poi non serve più intervenire: lo script gira da
 * solo ogni giorno sui server di Google, e l'unica cosa da mantenere
 * aggiornata resta il foglio Google, esattamente come oggi.
 *
 * NOME DEL FOGLIO
 * Per default lo script legge il PRIMO foglio (tab) dello spreadsheet.
 * Se l'agenda di Sara è su un tab con un nome diverso dal primo,
 * imposta SHEET_NAME qui sotto con il nome esatto di quel tab.
 *
 * COLONNE ATTESE (intestazioni nella prima riga del foglio)
 * date, date_end, program, venue, city, note, lat, lng, instagram, facebook
 * (le stesse colonne già usate oggi nel foglio pubblicato come CSV).
 *
 * TOKEN CON SCADENZA
 * Il token GitHub creato come "fine-grained" scade al massimo dopo 366
 * giorni (limite imposto da GitHub per i repository di organizzazioni;
 * sui repository personali si può impostare "senza scadenza", ma è comunque
 * buona norma rigenerarlo periodicamente). Per non doversene ricordare da
 * soli: se la sincronizzazione fallisce (token scaduto o altro errore),
 * lo script invia automaticamente una email di avviso all'indirizzo
 * Google che possiede questo progetto Apps Script (oppure all'indirizzo
 * impostato nella proprietà script facoltativa NOTIFY_EMAIL).
 */

var GITHUB_OWNER  = 'saramariafantini';
var GITHUB_REPO   = 'saramariafantini.github.io';
var GITHUB_PATH   = 'agenda-data.json';
var GITHUB_BRANCH = 'main';

/** Nome del foglio da leggere (lascia vuoto per usare il primo tab). */
var SHEET_NAME = '';

function pushAgendaToGitHub() {
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = SHEET_NAME ? ss.getSheetByName(SHEET_NAME) : ss.getSheets()[0];
    var values = sheet.getDataRange().getValues();

    var headers = values[0].map(function (h) { return String(h).trim(); });
    var concerts = [];

    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var record = {};
      headers.forEach(function (h, idx) { record[h] = row[idx]; });

      var dateStr = formatDate_(record['date']);
      if (!dateStr) continue; // riga senza data valida: ignorata

      concerts.push({
        date: dateStr,
        date_end: formatDate_(record['date_end']),
        program: cleanText_(record['program']),
        venue: cleanText_(record['venue']),
        city: cleanText_(record['city']),
        note: cleanText_(record['note']),
        lat: parseFloat(record['lat']) || 0,
        lng: parseFloat(record['lng']) || 0,
        instagram: cleanText_(record['instagram']),
        facebook: cleanText_(record['facebook'])
      });
    }

    concerts.sort(function (a, b) { return a.date < b.date ? -1 : 1; });

    commitToGithub_(JSON.stringify(concerts, null, 2));
  } catch (err) {
    notifyFailure_(err);
    throw err;
  }
}

/**
 * Avvisa via email in caso di errore (es. token GitHub scaduto), così il
 * problema non passa inosservato per mesi. Destinatario: la proprietà
 * script NOTIFY_EMAIL se impostata, altrimenti l'account Google che
 * possiede questo progetto Apps Script.
 */
function notifyFailure_(err) {
  try {
    var email = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL')
      || Session.getEffectiveUser().getEmail();
    if (!email) return;
    MailApp.sendEmail(
      email,
      'Agenda Sara Maria Fantini: sincronizzazione con GitHub fallita',
      'La sincronizzazione automatica dell\'agenda (Google Sheet → sito) è fallita.\n\n' +
      'Errore: ' + (err && err.message ? err.message : err) + '\n\n' +
      'Causa più probabile: il token GitHub (proprietà script GITHUB_TOKEN) è scaduto ' +
      'o non è più valido (i token \"fine-grained\" scadono al massimo dopo 366 giorni ' +
      'sui repository di organizzazioni).\n\n' +
      'Come risolvere:\n' +
      '1. Su GitHub: Settings → Developer settings → Personal access tokens → genera un nuovo token.\n' +
      '2. Apri questo progetto Apps Script → Impostazioni progetto → Proprietà script →\n' +
      '   aggiorna il valore di GITHUB_TOKEN col nuovo token.\n' +
      '3. Esegui una volta a mano la funzione pushAgendaToGitHub per verificare che funzioni.\n\n' +
      'Nel frattempo il sito continua a mostrare gli ultimi dati sincronizzati con successo.'
    );
  } catch (mailErr) {
    Logger.log('Impossibile inviare l\'email di notifica: ' + mailErr);
  }
}

function cleanText_(v) {
  if (v === null || v === undefined) return '';
  return String(v).trim().replace(/^["“”]+|["“”]+$/g, '').trim();
}

function formatDate_(v) {
  if (!v) return '';
  var tz = Session.getScriptTimeZone();
  if (Object.prototype.toString.call(v) === '[object Date]') {
    return Utilities.formatDate(v, tz, 'yyyy-MM-dd');
  }
  var s = String(v).trim().replace(/\//g, '-').replace(/\s+/g, '');
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(s)) {
    var parts = s.split('-');
    return parts[0] + '-' + ('0' + parts[1]).slice(-2) + '-' + ('0' + parts[2]).slice(-2);
  }
  var d = new Date(s);
  return isNaN(d.getTime()) ? '' : Utilities.formatDate(d, tz, 'yyyy-MM-dd');
}

function commitToGithub_(newContent) {
  var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
  if (!token) throw new Error('Manca la proprietà script GITHUB_TOKEN. Vedi le istruzioni in cima al file.');

  var apiUrl = 'https://api.github.com/repos/' + GITHUB_OWNER + '/' + GITHUB_REPO + '/contents/' + GITHUB_PATH;
  var headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github+json'
  };

  // 1. Recupera lo sha del file attuale (serve a GitHub per aggiornarlo)
  var sha = null, currentContent = null;
  var getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + GITHUB_BRANCH, {
    method: 'get', headers: headers, muteHttpExceptions: true
  });
  if (getResp.getResponseCode() === 200) {
    var current = JSON.parse(getResp.getContentText());
    sha = current.sha;
    currentContent = Utilities.newBlob(
      Utilities.base64Decode(current.content.replace(/\n/g, ''))
    ).getDataAsString('UTF-8');
  }

  // 2. Se il contenuto non è cambiato, non fare un commit inutile
  if (currentContent !== null && currentContent.trim() === newContent.trim()) {
    Logger.log('Nessuna modifica rispetto al foglio, salto il commit.');
    return;
  }

  // 3. Crea/aggiorna il file su GitHub
  var payload = {
    message: 'Aggiornamento automatico agenda (' + new Date().toISOString() + ')',
    content: Utilities.base64Encode(newContent, Utilities.Charset.UTF_8),
    branch: GITHUB_BRANCH
  };
  if (sha) payload.sha = sha;

  var putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: headers,
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  var code = putResp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('Errore GitHub API (' + code + '): ' + putResp.getContentText());
  }
  Logger.log('agenda-data.json aggiornato con successo.');
}
