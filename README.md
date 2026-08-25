# MaterDeiKalender

Een samenvattende **jaarkalender** voor de school (Mater Dei / OZCS Vorselaar),
automatisch gegenereerd uit de gepubliceerde Outlook-schoolkalender. De
kalender toont het lopende schooljaar (**september t.e.m. juni**, geen
juli/augustus) als 10 maandkalendertjes, is bruikbaar op het scherm en is
ontworpen om op **2 A4-bladen (liggend)** te printen.

De kalenderdata wordt **bij elke pagina-load opnieuw opgehaald en geparsed**
— er wordt niets opgeslagen of gecachet. De huidige datum/tijd staat steeds
bovenaan de pagina ("Bijgewerkt op: ...").

## Installatie

```bash
npm install
npm start
```

Open daarna <http://localhost:8080> in de browser.

`npm install` kopieert automatisch (via de `postinstall`-script) de
benodigde `ical.js`-bibliotheek naar `public/vendor/`. Er is verder **geen
build-stap** nodig: de website is gewone HTML/CSS/JS.

## Hoe het werkt

- `public/js/config.js` bevat de link naar de gepubliceerde Outlook-kalender
  en zet die om naar de bijhorende `.ics`-feed (Outlook publiceert naast een
  `calendar.html`-weergave altijd ook een `calendar.ics`-feed op hetzelfde
  pad).
- `public/js/icsParser.js` haalt die feed op in de browser en parseert ze met
  [`ical.js`](https://github.com/mozilla-comm/ical.js) (inclusief expansie
  van terugkerende events).
- `public/js/calendarBuilder.js` groepeert de events per dag over de 10
  maanden van het schooljaar.
- `public/js/render.js` en `app.js` bouwen daarmee de pagina op, telkens
  wanneer de pagina geladen wordt.

### Belangrijk: CORS

Gepubliceerde Outlook-kalenders zetten niet altijd CORS-headers, waardoor een
rechtstreekse `fetch()` vanuit de browser kan mislukken. De app probeert
eerst een directe fetch, en valt bij falen terug op een publieke CORS-proxy
(`CORS_PROXY` in `config.js`). Als die gratis proxy onbetrouwbaar blijkt,
kan je:

- de waarde van `CORS_PROXY` vervangen door een andere proxy-dienst, of
- `CORS_PROXY` op `""` zetten en zelf een kleine proxy (bv. een serverless
  function) opzetten die de `.ics`-feed doorgeeft.

Als beide pogingen mislukken, toont de pagina een duidelijke Nederlandstalige
foutmelding in plaats van stil te falen.

## Kalenderbron aanpassen

Wijzig `GEPUBLICEERDE_KALENDER_URL` in `public/js/config.js` als de school
een andere Outlook-link publiceert.

## Printen

Klik op **Afdrukken** op de pagina, of gebruik Ctrl+P / Cmd+P. De pagina is
opgemaakt voor **A4 liggend**, met 5 maanden per blad (2 bladen in totaal).
Kies in het printvenster:

- Layout: **Liggend (landscape)**
- Papierformaat: **A4**
- Marges: **Standaard/minimaal** (de pagina reserveert zelf 1 cm marge)

Controleer in de afdrukvoorbeeld dat de kalender netjes over 2 bladen
verdeeld is (5 maanden per blad).

## Projectstructuur

```
public/
  index.html            Hoofdpagina
  css/style.css          Scherm- en printstijlen
  js/
    config.js             Kalenderbron, CORS-proxy, schooljaar-logica
    icsParser.js           Ophalen + parsen van de .ics-feed
    calendarBuilder.js     Bouwt de 10-maanden structuur
    render.js               Rendert header + maandkaarten
    app.js                   Startpunt, draait bij elke pageload
  vendor/                 Gegenereerd door `npm install` (niet gecommit)
scripts/
  copy-vendor.js          Kopieert ical.js naar public/vendor
test-fixtures/
  sample.ics               Voorbeeldbestand voor lokaal testen
```
