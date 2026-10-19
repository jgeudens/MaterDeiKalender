import { readFileSync } from "node:fs";
import { join } from "node:path";
import { vi } from "vitest";

// Geen new URL(..., import.meta.url): in jsdom is URL die van de browser.
export function projectPad(relatief) {
  return join(import.meta.dirname, "..", relatief);
}

export const SAMPLE_ICS = readFileSync(projectPad("test-fixtures/sample.ics"), "utf8");

export function respons(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: vi.fn(async () => body),
  };
}

// Stubt de globale fetch met een functie die per URL een respons (of fout) geeft.
export function stubFetch(afhandelaar) {
  const fetchMock = vi.fn(async (url, opties) => afhandelaar(String(url), opties));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

export function icsKalender(...vevents) {
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MaterDeiKalender//Test//NL",
    ...vevents.flatMap((regels, i) => [
      "BEGIN:VEVENT",
      `UID:inline-${i}@test`,
      "DTSTAMP:20260101T000000Z",
      ...regels,
      "END:VEVENT",
    ]),
    "END:VCALENDAR",
  ].join("\r\n");
}
