// Configuratie van de kalenderbron en het schooljaar.
// Pas GEPUBLICEERDE_KALENDER_URL aan als de school een andere Outlook-link publiceert.

const GEPUBLICEERDE_KALENDER_URL =
  "https://outlook.office365.com/owa/calendar/9c33be671c99409ab82cabd21ee28279@ozcsvorselaar.be/96af7dec4efa40269c02d75908d63ac07805844575790904765/calendar.html";

// Outlook publiceert naast de .html-weergave altijd ook een .ics-feed op hetzelfde pad.
export const ICS_URL = GEPUBLICEERDE_KALENDER_URL.replace(/calendar\.html$/, "calendar.ics");

// Gepubliceerde Outlook-kalenders zetten niet altijd CORS-headers, waardoor een
// rechtstreekse fetch() vanuit de browser kan mislukken. Als fallback proberen we
// een reeks publieke CORS-proxy's, na elkaar, tot er één lukt — gratis proxy's
// vallen wel eens uit of raten (bv. HTTP 429), dus met meerdere opties na elkaar
// blijft de kalender werken zolang er minstens één beschikbaar is. Zet op [] om
// de fallback uit te schakelen, of vervang door een eigen proxy (bv. een
// serverless function) als geen van deze gratis diensten betrouwbaar blijkt.
export const CORS_PROXIES = [
  (url) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://cors.eu.org/${url}`,
];

// Het schooljaar loopt van september tot en met juni (geen juli/augustus): 10 maanden.
export const SCHOOLJAAR_START_MAAND = 9; // september (1 = januari)
export const SCHOOLJAAR_EIND_MAAND = 6; // juni
export const AANTAL_MAANDEN = 10;

// Vanaf welke maand we tijdens de zomer al het AANKOMENDE schooljaar tonen i.p.v.
// het pas afgelopen jaar (dat toch niet meer relevant is als er geen juli/augustus
// getoond wordt). Vanaf juli tonen we dus al september-juni van het nieuwe jaar.
const OVERGANG_NAAR_NIEUW_SCHOOLJAAR_MAAND = 7; // juli

const MAAND_NAMEN = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december",
];

export function naamVanMaand(maandIndex1Based) {
  return MAAND_NAMEN[maandIndex1Based - 1];
}

// Bepaalt het lopende schooljaar (bv. vandaag = feb 2027 -> start = 2026, eind = 2027)
// en geeft de lijst van {maand, jaar} op, van september tot en met juni.
export function bepaalSchooljaarMaanden(vandaag = new Date()) {
  const huidigeMaand = vandaag.getMonth() + 1;
  const startJaar =
    huidigeMaand >= OVERGANG_NAAR_NIEUW_SCHOOLJAAR_MAAND
      ? vandaag.getFullYear()
      : vandaag.getFullYear() - 1;

  const maanden = [];
  for (let i = 0; i < AANTAL_MAANDEN; i++) {
    const maandIndex = ((SCHOOLJAAR_START_MAAND - 1 + i) % 12) + 1;
    const jaar = maandIndex >= SCHOOLJAAR_START_MAAND ? startJaar : startJaar + 1;
    maanden.push({ maand: maandIndex, jaar });
  }
  return maanden;
}

export function bepaalSchooljaarBereik(vandaag = new Date()) {
  const maanden = bepaalSchooljaarMaanden(vandaag);
  const eerste = maanden[0];
  const laatste = maanden[maanden.length - 1];
  const start = new Date(eerste.jaar, eerste.maand - 1, 1, 0, 0, 0);
  const eind = new Date(laatste.jaar, laatste.maand, 0, 23, 59, 59); // laatste dag van de laatste maand
  return { start, eind };
}
