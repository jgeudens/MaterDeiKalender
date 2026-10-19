// Filtert events op leerjaar. De doelgroep van een event staat in de titel
// als prefix voor de eerste "_" (bv. "L1, L2 en L3_bib") of voor de eerste ":"
// (bv. "L1: uitstap naar ..."). Events zonder herkenbare leerjaren (KS, LS,
// KS/LS of geen prefix) zijn algemeen en altijd zichtbaar.

export const LEERJAREN = [
  { code: "IK", label: "Instapklas (IK)" },
  { code: "K1", label: "Kleuter 1 (K1)" },
  { code: "K2", label: "Kleuter 2 (K2)" },
  { code: "K3", label: "Kleuter 3 (K3)" },
  { code: "L1", label: "Leerjaar 1 (L1)" },
  { code: "L2", label: "Leerjaar 2 (L2)" },
  { code: "L3", label: "Leerjaar 3 (L3)" },
  { code: "L4", label: "Leerjaar 4 (L4)" },
  { code: "L5", label: "Leerjaar 5 (L5)" },
  { code: "L6", label: "Leerjaar 6 (L6)" },
];

const ALLE_CODES = LEERJAREN.map((l) => l.code);
const KLEUTER_CODES = ["IK", "K1", "K2", "K3"];
const LAGER_CODES = ALLE_CODES.filter((c) => c.startsWith("L"));

const UITSLUITING_PREFIX = /^(KS|LS)\s*\(\s*niet\s+([^)]*)\)/i;

function haalPrefix(titel) {
  const underscore = titel.indexOf("_");
  if (underscore !== -1) return titel.slice(0, underscore);
  const dubbelepunt = titel.indexOf(":");
  if (dubbelepunt !== -1) return titel.slice(0, dubbelepunt);
  return "";
}

// Vindt alle leerjaren in een stuk tekst: losse codes (L5B telt als L5) en
// reeksen als "L2-L6" of "K1-K2-K3".
function vindLeerjaren(tekst) {
  const gevonden = new Set();

  const zonderReeksen = tekst.replace(/([KL])(\d)((?:\s*-\s*[KL]?\d)+)/g, (_, letter, eerste, rest) => {
    const cijfers = [Number(eerste), ...rest.match(/\d/g).map(Number)];
    for (let n = Math.min(...cijfers); n <= Math.max(...cijfers); n++) {
      gevonden.add(`${letter}${n}`);
    }
    return " ";
  });

  for (const [, code] of zonderReeksen.matchAll(/\b(IK|[KL][1-6])(?=[A-Z]?\b)/g)) {
    gevonden.add(code);
  }

  return [...gevonden].filter((code) => ALLE_CODES.includes(code));
}

// Geeft een Set leerjaren terug, of null als het event algemeen is.
export function bepaalDoelgroepen(titel) {
  const prefix = haalPrefix(titel).trim();

  const uitsluiting = prefix.match(UITSLUITING_PREFIX);
  if (uitsluiting) {
    const basis = uitsluiting[1].toUpperCase() === "KS" ? KLEUTER_CODES : LAGER_CODES;
    const uitgesloten = new Set(vindLeerjaren(uitsluiting[2]));
    return new Set(basis.filter((code) => !uitgesloten.has(code)));
  }

  const leerjaren = vindLeerjaren(prefix);
  return leerjaren.length > 0 ? new Set(leerjaren) : null;
}

export function isZichtbaar(event, gekozen) {
  if (!gekozen) return true;
  if (event.doelgroepen === undefined) event.doelgroepen = bepaalDoelgroepen(event.titel);
  return event.doelgroepen === null || event.doelgroepen.has(gekozen);
}

export function filterEvents(events, gekozen) {
  return gekozen ? events.filter((event) => isZichtbaar(event, gekozen)) : events;
}

const URL_PARAM = "leerjaar";
const OPSLAG_SLEUTEL = "leerjaar";

function isGeldig(code) {
  return ALLE_CODES.includes(code);
}

// localStorage kan geblokkeerd zijn (al bij het opvragen); dan null.
function standaardOpslag() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

// Volgorde: URL-parameter, daarna de laatst onthouden keuze, anders alles.
export function leesGekozenLeerjaar(zoekString = window.location.search, opslag = standaardOpslag()) {
  const uitUrl = new URLSearchParams(zoekString).get(URL_PARAM);
  if (uitUrl !== null) {
    const code = uitUrl.toUpperCase();
    return isGeldig(code) ? code : "";
  }
  try {
    const bewaard = opslag?.getItem(OPSLAG_SLEUTEL);
    if (bewaard && isGeldig(bewaard)) return bewaard;
  } catch {
    // localStorage kan geblokkeerd zijn; de URL volstaat dan.
  }
  return "";
}

export function bewaarGekozenLeerjaar(code, opslag = standaardOpslag()) {
  const url = new URL(window.location.href);
  if (code) url.searchParams.set(URL_PARAM, code);
  else url.searchParams.delete(URL_PARAM);
  window.history.replaceState(null, "", url);

  try {
    if (code) opslag?.setItem(OPSLAG_SLEUTEL, code);
    else opslag?.removeItem(OPSLAG_SLEUTEL);
  } catch {
    // Negeren: bewaren is een gemak, geen vereiste.
  }
}
