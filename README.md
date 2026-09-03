# saramariafantini.github.io

Sito personale di Sara Maria Fantini, musicista specializzata in musica
medievale (liuto medievale, guiterne, oud). Pubblico target internazionale
(IT / EN / FR).

Nessun framework, nessun build step: HTML/CSS/JS scritti a mano, ospitati su
**GitHub Pages** con dominio personalizzato `saramariafantini.com` (vedi
`CNAME`). Per pubblicare una modifica basta fare commit + push su `main`.

## Struttura delle pagine

Il sito **non** usa sottocartelle per lingua (`/en/`, `/fr/`) né una
sottocartella per le pagine: tutti i file sono nella root, con suffisso di
lingua nel nome:

```
index.html                              landing page — solo selettore di lingua (IT/EN/FR)
home-it.html / home-en.html / home-fr.html
agenda-it.html / agenda-en.html / agenda-fr.html
chordacordis-it.html / -en.html / -fr.html
collaborazioni-it.html / -en.html / -fr.html
contatti-it.html / -en.html / -fr.html
fragmenta-it.html / -en.html / -fr.html
media-it.html / -en.html / -fr.html
shared.css                              CSS condiviso solo per navbar e footer (vedi sotto)
```

**Importante**: `index.html` è l'unica pagina con un selettore di lingua vero
e proprio a schermo intero (tre pulsanti che portano a `home-it/en/fr.html`).
Le pagine interne hanno invece un piccolo selettore di lingua **in pagina**,
nella navbar (vedi sezione dedicata più sotto) — a differenza del sito
gemello biancacucini.com, che non lo ha.

Ogni pagina ha in `<head>`: `<link rel="canonical">` e 4 `<link rel="alternate"
hreflang="...">` (it, en, fr, x-default) che puntano alle rispettive versioni.
Per il gruppo home, `x-default` punta a `index.html`; per tutte le altre
pagine punta alla versione inglese (lingua di ripiego per pubblico
internazionale).

## CSS condiviso (navbar e footer)

A differenza del sito gemello biancacucini.com — dove ogni pagina è
completamente autonoma — qui **navbar e footer usano un foglio di stile
condiviso**, `shared.css`, incluso via `<link>` in ogni pagina (tranne
`index.html`, che non ha né navbar né footer).

Le regole *strutturali* (layout, hover, transizioni) sono identiche per tutte
le pagine e vivono in `shared.css`. I *colori*, che cambiano da pagina a
pagina, sono invece variabili CSS (`--nav-bg`, `--footer-social`, ecc.)
dichiarate in un piccolo blocco `:root` nell'head di ciascuna pagina — è lì
che si interviene per cambiare i colori di navbar/footer di una singola
pagina, non in `shared.css`.

Esistono quattro combinazioni di colori realmente in uso (non un'unica
palette condivisa):

- **"dark"** (home, contatti): navbar/footer quasi neri (`#060608`), testo
  crema (`#f9f4e0`)/grigio (`#888888`).
- **"green"** (chordacordis, collaborazioni, fragmenta): navbar/footer verde
  salvia (`#9caf88`), testo scuro (`#2a2a2a`).
- **"pale-green"** (solo agenda): footer verde molto chiaro (`#e8f0e2`),
  stessa navbar verde delle pagine "green".
- **"media"**: stessa navbar delle pagine "dark", ma footer leggermente più
  scuro (`#0e0e10`) per adattarsi allo sfondo quasi nero della pagina.

Il resto del CSS di ogni pagina (hero, sezioni, gallery, ecc.) **non** è
condiviso: ogni pagina definisce il proprio in un `<style>` inline, con
valori scritti direttamente in esadecimale (non ci sono variabili CSS per la
palette generale, solo per navbar/footer). Una modifica di stile "globale"
al di fuori di navbar/footer va quindi ripetuta manualmente su tutte le
pagine interessate.

## Selettore di lingua in pagina

Nella navbar di ogni pagina (tranne `index.html`) compare un piccolo
indicatore della lingua corrente (es. "it"), minuscolo e volutamente
discreto — un piccolo riquadro allineato alle altre voci di menu ma
visivamente secondario, per non competere con la navigazione principale.

- **Passandoci sopra con il mouse** (dispositivi con puntatore reale) si apre
  un piccolo menu con le altre due lingue; resta aperto per mezzo secondo
  dopo che il puntatore se ne allontana, il tempo di raggiungerlo senza che
  sparisca a metà strada.
- **Su schermi touch** funziona a tocco, riusando lo stesso meccanismo
  Bootstrap del menu a tendina "Progetti" — nessun codice nuovo per il touch.
- **Su mobile è posizionato fuori dal menu hamburger**, subito accanto
  all'icona, sempre visibile: non serve aprire il menu per cambiare lingua.
  Per questo motivo esistono **due copie** dello switcher nel markup di ogni
  pagina — una per desktop (dentro il menu a tendina, visibile da `sm` in su)
  e una per mobile (accanto all'hamburger, nascosta da `sm` in su) — mai
  entrambe visibili contemporaneamente. Tutto lo stile vive in `shared.css`.
- Ogni pagina rimanda alla propria corrispondente nelle altre lingue (es. da
  `agenda-en.html` si arriva ad `agenda-it.html`, non alla home).

## Pagina Agenda — come funziona

Stessa architettura del sito gemello biancacucini.com, pensata per
permettere a Sara di aggiornare il calendario concerti **senza toccare mai
il codice**, tramite un foglio Google.

### Flusso dei dati

```
Foglio Google "Concerti"  (Sara modifica qui, come sempre)
        │
        │  1 volta al giorno (trigger a tempo)
        ▼
Google Apps Script (agenda-sync)  →  legge il foglio, pubblica via GitHub API
        │
        ▼
agenda-data.json  (nella root del repo, stesso dominio del sito)
        │
        │  fetch() dal browser del visitatore
        ▼
agenda-it/en/fr.html  →  fetch('agenda-data.json') → initAgenda(dati)
        │
        │  se il fetch fallisce (file irraggiungibile)
        ▼
FALLBACK_CONCERTS  (array statico dentro l'HTML, 13 concerti reali)
```

**Perché questa architettura**: in origine il sito leggeva Google Sheets
direttamente dal browser del visitatore. Le reti aziendali che bloccano
Google Docs/Sheets per policy impedivano il caricamento dell'agenda a chi
visitava da lì. Spostando la pubblicazione dei dati su un file dello stesso
dominio (`agenda-data.json`), il sito non contatta più Google in nessun
momento: la richiesta è identica a quella per qualunque altra immagine o
script del sito, quindi non è bloccabile per categoria da un firewall
aziendale.

### I file coinvolti

- **`agenda-data.json`** (root del repo): snapshot dei dati del foglio, in
  formato array di oggetti con questi campi esatti:
  `date, date_end, program, venue, city, note, lat, lng, instagram, facebook`.
  Aggiornato automaticamente — non va modificato a mano. Nota: a differenza
  di biancacucini.com, qui non ci sono i campi `time`, `festival` ed
  `ensemble` — lo schema riflette semplicemente le colonne già in uso nel
  foglio Google di Sara.
- **`apps-script/agenda-sync.gs`**: copia di riferimento/documentazione dello
  script. **Non viene eseguito dal sito**: va incollato manualmente
  nell'editor Google Apps Script agganciato al foglio Google di Sara
  (Estensioni → Apps Script). Le istruzioni di installazione sono nei
  commenti in testa al file stesso.
- **`agenda-it/en/fr.html`**: contengono la funzione `initAgenda(concerts)`
  che riceve l'array di concerti e disegna la timeline verticale dei
  prossimi concerti e l'archivio raggruppato per anno (collassabile), oltre
  a una mappa Leaflet dell'archivio (tile OpenStreetMap standard, senza
  bisogno di API key). La distinzione "prossimo vs passato" è **calcolata
  dinamicamente** confrontando `date`/`date_end` con la data odierna
  (funzione `isUpcoming`) — non è un campo da impostare a mano.

### Autenticazione verso GitHub

Lo script Apps Script scrive su GitHub tramite un **Personal Access Token
fine-grained**, salvato come proprietà script (`GITHUB_TOKEN`), con permesso
limitato a `Contents: Read and write` sul solo repo
`saramariafantini/saramariafantini.github.io`.

Se il token scade e non viene rinnovato, il sito non si rompe: continua
semplicemente a mostrare l'ultimo `agenda-data.json` sincronizzato con
successo. Lo script invia comunque un'email di avviso in caso di
fallimento, all'indirizzo Google che possiede lo script (o a `NOTIFY_EMAIL`
se impostata come proprietà script).

### Il fallback statico

`FALLBACK_CONCERTS`, dentro ciascun `agenda-*.html`, è l'ultima rete di
sicurezza se anche `agenda-data.json` fosse irraggiungibile. Contiene una
selezione di concerti reali (non l'intero storico — per quello c'è
`agenda-data.json`). Se lo si modifica, va rispettato lo stesso schema di
campi elencato sopra.

## SEO

- `sitemap.xml` e `robots.txt` in root, con tutte le 22 pagine indicizzabili.
- Meta description uniche e scritte a mano per ogni pagina/lingua.
- Favicon dichiarata anche a 180×180px (oltre a 16/32px) — Google richiede
  almeno 48×48px per mostrarla nei risultati di ricerca.
- La pagina Fragmenta usa una **favicon propria** (`imgs/fragmenta/`),
  diversa dalla rosa usata dal resto del sito — non è un errore, è
  intenzionale.

## Cose particolari da ricordare

- Il numero WhatsApp nella pagina Contatti non è scritto in chiaro
  nell'HTML: viene ricostruito via JavaScript (`contatti-*.html`, variabile
  `p`) per renderlo un minimo più difficile da raccogliere con scraper
  automatici. Per cambiarlo, modifica l'array in quello script inline.
- La pagina Media ha una gallery fotografica con lightbox scritta da zero
  (`openLightbox` / `lbNav`), indipendente dai video (card che aprono un
  iframe YouTube inline) e dai post Instagram/Facebook incorporati più in
  basso nella stessa pagina.
- La pagina Fragmenta include un video teaser (`imgs/siobule/siobule-teaser.mp4`)
  ed è l'unica pagina del sito a usarlo.
- `index.html` e le tre `home-*.html` sono pagine diverse: `index.html` è
  solo lo splash/selettore lingua a schermo intero (font Cinzel Decorative
  per il titolo), `home-*.html` è la vera homepage con i contenuti (font
  Lora per i titoli, come tutte le altre pagine interne).
- Le immagini sono state ottimizzate (nessuna supera i 2048px sul lato
  lungo, dimensione già ampiamente sufficiente per come vengono mostrate sul
  sito) e i JPEG più pesanti ricompressi a qualità 85 — non caricare foto a
  piena risoluzione fotocamera senza prima ridimensionarle, altrimenti si
  torna al problema di partenza.

---

© 2026 Sara Maria Fantini — All rights reserved
