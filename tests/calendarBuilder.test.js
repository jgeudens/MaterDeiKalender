import { describe, it, expect } from "vitest";
import { bouwSchooljaarKalender } from "../public/js/calendarBuilder.js";

const VANDAAG = new Date(2026, 9, 14, 10, 30); // woensdag 14 oktober 2026

function heleDag(titel, [j1, m1, d1], [j2, m2, d2]) {
  // ICS-stijl: einddatum is exclusief.
  return { titel, start: new Date(j1, m1 - 1, d1), eind: new Date(j2, m2 - 1, d2), allDay: true };
}

function getimed(titel, start, eind) {
  return { titel, start, eind, allDay: false };
}

function vindMaand(kalender, naam, jaar) {
  return kalender.find((m) => m.naam === naam && m.jaar === jaar);
}

function dagenMetEvent(kalender, titel) {
  const resultaat = [];
  for (const maand of kalender) {
    for (const dag of maand.dagen) {
      if (dag.events.some((e) => e.titel === titel)) {
        resultaat.push(`${dag.datum.getFullYear()}-${dag.datum.getMonth() + 1}-${dag.dagNr}`);
      }
    }
  }
  return resultaat;
}

describe("bouwSchooljaarKalender: structuur", () => {
  const kalender = bouwSchooljaarKalender([], VANDAAG);

  it("geeft 10 maanden van september t.e.m. juni", () => {
    expect(kalender.map((m) => `${m.naam} ${m.jaar}`)).toEqual([
      "september 2026",
      "oktober 2026",
      "november 2026",
      "december 2026",
      "januari 2027",
      "februari 2027",
      "maart 2027",
      "april 2027",
      "mei 2027",
      "juni 2027",
    ]);
  });

  it("heeft het juiste aantal dagen per maand", () => {
    expect(kalender.map((m) => m.dagen.length)).toEqual([30, 31, 30, 31, 31, 28, 31, 30, 31, 30]);
  });

  it("geeft februari 29 dagen in een schrikkeljaar", () => {
    const k = bouwSchooljaarKalender([], new Date(2027, 10, 1)); // schooljaar 2027-2028
    expect(vindMaand(k, "februari", 2028).dagen).toHaveLength(29);
  });

  it("vult dagNr, weekdag en weekend correct in", () => {
    const sept = vindMaand(kalender, "september", 2026);
    // 1 september 2026 is een dinsdag.
    expect(sept.dagen[0]).toMatchObject({ dagNr: 1, weekdagKort: "di", isWeekend: false, events: [] });
    expect(sept.dagen[4]).toMatchObject({ dagNr: 5, weekdagKort: "za", isWeekend: true });
    expect(sept.dagen[5]).toMatchObject({ dagNr: 6, weekdagKort: "zo", isWeekend: true });
    expect(sept.dagen[6]).toMatchObject({ dagNr: 7, weekdagKort: "ma", isWeekend: false });
    expect(sept.dagen.map((d) => d.dagNr)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
  });

  it("markeert alleen vandaag als isVandaag", () => {
    const gemarkeerd = kalender.flatMap((m) => m.dagen).filter((d) => d.isVandaag);
    expect(gemarkeerd).toHaveLength(1);
    expect(gemarkeerd[0].datum).toEqual(new Date(2026, 9, 14));
  });

  it("markeert geen dag als vandaag tijdens de zomer", () => {
    const k = bouwSchooljaarKalender([], new Date(2027, 6, 15));
    expect(k.flatMap((m) => m.dagen).some((d) => d.isVandaag)).toBe(false);
  });
});

describe("bouwSchooljaarKalender: events", () => {
  it("zet een hele-dag-event enkel op zijn eigen dag (einddatum exclusief)", () => {
    const k = bouwSchooljaarKalender([heleDag("Eerste schooldag", [2026, 9, 1], [2026, 9, 2])], VANDAAG);
    expect(dagenMetEvent(k, "Eerste schooldag")).toEqual(["2026-9-1"]);
  });

  it("verspreidt een meerdaags hele-dag-event over alle dagen", () => {
    const k = bouwSchooljaarKalender([heleDag("Herfstvakantie", [2026, 11, 2], [2026, 11, 7])], VANDAAG);
    expect(dagenMetEvent(k, "Herfstvakantie")).toEqual([
      "2026-11-2",
      "2026-11-3",
      "2026-11-4",
      "2026-11-5",
      "2026-11-6",
    ]);
  });

  it("verspreidt een event over een maandgrens", () => {
    const k = bouwSchooljaarKalender([heleDag("Uitstap", [2026, 10, 30], [2026, 11, 3])], VANDAAG);
    expect(dagenMetEvent(k, "Uitstap")).toEqual(["2026-10-30", "2026-10-31", "2026-11-1", "2026-11-2"]);
  });

  it("verspreidt een event over de jaarwissel", () => {
    const k = bouwSchooljaarKalender([heleDag("Kerstvakantie", [2026, 12, 21], [2027, 1, 4])], VANDAAG);
    const dagen = dagenMetEvent(k, "Kerstvakantie");
    expect(dagen).toHaveLength(14);
    expect(dagen[0]).toBe("2026-12-21");
    expect(dagen.at(-1)).toBe("2027-1-3");
  });

  it("zet een getimed event op zijn dag", () => {
    const k = bouwSchooljaarKalender(
      [getimed("Oudercontact", new Date(2027, 5, 10, 19), new Date(2027, 5, 10, 21))],
      VANDAAG
    );
    expect(dagenMetEvent(k, "Oudercontact")).toEqual(["2027-6-10"]);
  });

  it("zet een getimed event over middernacht op beide dagen", () => {
    const k = bouwSchooljaarKalender(
      [getimed("Nachtwandeling", new Date(2026, 9, 9, 23), new Date(2026, 9, 10, 1))],
      VANDAAG
    );
    expect(dagenMetEvent(k, "Nachtwandeling")).toEqual(["2026-10-9", "2026-10-10"]);
  });

  it("zet een getimed event dat eindigt om middernacht ook op de volgende dag", () => {
    // Bestaand gedrag: bij getimede events is het einde inclusief.
    const k = bouwSchooljaarKalender(
      [getimed("Fuif", new Date(2026, 9, 9, 20), new Date(2026, 9, 10, 0, 0))],
      VANDAAG
    );
    expect(dagenMetEvent(k, "Fuif")).toEqual(["2026-10-9", "2026-10-10"]);
  });

  it("negeert events buiten het schooljaar", () => {
    const k = bouwSchooljaarKalender(
      [
        heleDag("Zomerkamp", [2027, 7, 5], [2027, 7, 10]),
        heleDag("Vorig jaar", [2026, 3, 1], [2026, 3, 2]),
      ],
      VANDAAG
    );
    expect(dagenMetEvent(k, "Zomerkamp")).toEqual([]);
    expect(dagenMetEvent(k, "Vorig jaar")).toEqual([]);
  });

  it("knipt events af die buiten het schooljaar doorlopen", () => {
    const k = bouwSchooljaarKalender([heleDag("Lang", [2026, 8, 28], [2026, 9, 3])], VANDAAG);
    expect(dagenMetEvent(k, "Lang")).toEqual(["2026-9-1", "2026-9-2"]);
  });

  it("behoudt de volgorde van meerdere events op dezelfde dag", () => {
    const a = heleDag("A", [2026, 9, 1], [2026, 9, 2]);
    const b = getimed("B", new Date(2026, 8, 1, 9), new Date(2026, 8, 1, 10));
    const k = bouwSchooljaarKalender([a, b], VANDAAG);
    expect(vindMaand(k, "september", 2026).dagen[0].events).toEqual([a, b]);
  });

  it("gebruikt standaard de huidige datum", () => {
    expect(bouwSchooljaarKalender([])).toHaveLength(10);
  });
});
