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

De app is een statische site, maar heeft voor het ophalen van de kalenderdata
een kleine same-origin proxy nodig (zie [Belangrijk: CORS](#belangrijk-cors)
hieronder) die als Netlify Function draait. Gebruik daarom de Netlify CLI om
lokaal te ontwikkelen, zodat die functie ook lokaal beschikbaar is:

```bash
npm install
npx netlify dev
```

Netlify CLI opent zelf een browservenster (standaard op
<http://localhost:8888>).

`npm install` kopieert automatisch (via de `postinstall`-script) de
benodigde `ical.js`-bibliotheek naar `public/vendor/`. Er is verder **geen
build-stap** nodig: de website is gewone HTML/CSS/JS, aangevuld met één
serverless function.

Puur de statische pagina bekijken kan ook met `npm start`
(<http://localhost:8080>), maar dan werkt het ophalen van de kalender niet:
de proxy-functie draait dan niet mee.

## Hoe het werkt

- `public/js/kalenderUrl.js` haalt bij elke pageload eerst
  `https://www.materdeigooreind.be/kalender` op en leest daar de
  Outlook-link uit de ingesloten iframe. Zo staat de kalenderbron niet
  hardcoded in de code: als de school ooit een andere Outlook-kalender
  publiceert, wijzigt de iframe-link op de schoolwebsite en volgt de app
  automatisch mee. De gevonden `calendar.html`-link wordt omgezet naar de
  bijhorende `.ics`-feed (Outlook publiceert naast een `calendar.html`-
  weergave altijd ook een `calendar.ics`-feed op hetzelfde pad).
- `public/js/icsParser.js` haalt die feed op in de browser en parseert ze met
  [`ical.js`](https://github.com/mozilla-comm/ical.js) (inclusief expansie
  van terugkerende events).
- `public/js/calendarBuilder.js` groepeert de events per dag over de 10
  maanden van het schooljaar.
- `public/js/render.js` en `app.js` bouwen daarmee de pagina op, telkens
  wanneer de pagina geladen wordt.

### Belangrijk: CORS

Zowel de schoolwebsite (voor de kalenderlink) als gepubliceerde
Outlook-kalenders zetten niet altijd CORS-headers, waardoor een
rechtstreekse `fetch()` vanuit de browser kan mislukken. De app probeert bij
beide aanvragen eerst een directe fetch, en valt bij falen terug op
`netlify/functions/kalender-proxy.js`: een Netlify Function die op hetzelfde
domein draait en de schoolwebsite/Outlook-feed server-side ophaalt (zie
`PROXY_ENDPOINT` in `config.js`, standaard `/api/kalender-proxy`, doorgestuurd
naar de function via `netlify.toml`).

Eerder gebruikte de app hiervoor publieke CORS-proxy's
(corsproxy.io/allorigins/...), maar die bleken onbetrouwbaar: sommige vereisen
inmiddels een betaalde API-key, andere raten snel (HTTP 429) of vallen simpelweg
uit. Een same-origin Netlify Function heeft dat probleem niet. De function
staat alleen toe te proxyen naar `www.materdeigooreind.be` en
`outlook.office365.com` (zie `TOEGESTANE_HOSTS` erin), zodat het geen open
proxy wordt.

Als zowel de directe fetch als de proxy mislukken, toont de pagina een
duidelijke Nederlandstalige foutmelding in plaats van stil te falen.

## Kalenderbron aanpassen

De kalenderbron wordt automatisch afgeleid uit de iframe op
<https://www.materdeigooreind.be/kalender> — bij een gewijzigde Outlook-link
hoeft er dus niets aangepast te worden. Publiceert de school een compleet
andere kalenderpagina (ander adres, geen iframe meer, ...), pas dan
`KALENDER_PAGINA_URL` en/of de iframe-regex in `public/js/kalenderUrl.js`
aan.

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
netlify.toml              Netlify build- en redirect-config
netlify/functions/
  kalender-proxy.js        Same-origin proxy (CORS-fallback), zie hierboven
public/
  index.html            Hoofdpagina
  css/style.css          Scherm- en printstijlen
  js/
    config.js             Proxy-endpoint, schooljaar-logica
    kalenderUrl.js          Haalt de Outlook-kalenderlink op uit de schoolwebsite
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
