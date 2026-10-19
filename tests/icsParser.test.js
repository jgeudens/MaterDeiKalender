import { describe, it, expect } from "vitest";
import { parseIcsNaarEvents, haalIcsTekstOp, haalEventsOp } from "../public/js/icsParser.js";
import { SAMPLE_ICS, icsKalender, respons, stubFetch } from "./helpers.js";

// Schooljaar 2026-2027.
const START = new Date(2026, 8, 1, 0, 0, 0);
const EIND = new Date(2027, 5, 30, 23, 59, 59);

function parse(...vevents) {
  return parseIcsNaarEvents(icsKalender(...vevents), START, EIND);
}

function maandagenTussen(van, tot) {
  const resultaat = [];
  for (const d = new Date(van); d <= tot; d.setDate(d.getDate() + 1)) {
    if (d.getDay() === 1) resultaat.push(new Date(d));
  }
  return resultaat;
}

describe("parseIcsNaarEvents met sample.ics", () => {
  const events = parseIcsNaarEvents(SAMPLE_ICS, START, EIND);
  const metTitel = (titel) => events.filter((e) => e.titel === titel);

  it("neemt enkel events binnen het schooljaar op", () => {
    expect(metTitel("Testevent op vandaag")).toEqual([]);
    expect(metTitel("Eerste schooldag")).toHaveLength(1);
    expect(metTitel("Herfstvakantie")).toHaveLength(1);
    expect(metTitel("Oudercontact 6de leerjaar")).toHaveLength(1);
  });

  it("zet hele-dag-events om met exclusieve einddatum", () => {
    expect(metTitel("Herfstvakantie")[0]).toEqual({
      titel: "Herfstvakantie",
      start: new Date(2026, 10, 2),
      eind: new Date(2026, 10, 7),
      allDay: true,
    });
  });

  it("zet getimede events om naar lokale tijd", () => {
    expect(metTitel("Oudercontact 6de leerjaar")[0]).toEqual({
      titel: "Oudercontact 6de leerjaar",
      start: new Date(2027, 5, 10, 19, 0),
      eind: new Date(2027, 5, 10, 21, 0),
      allDay: false,
    });
  });

  it("breidt de wekelijkse herhaling uit over het hele schooljaar", () => {
    const zwemmen = metTitel("Zwemmen 3de leerjaar");
    const verwacht = maandagenTussen(new Date(2026, 8, 7), new Date(2027, 5, 29));
    expect(zwemmen.map((e) => e.start)).toEqual(verwacht);
    for (const e of zwemmen) {
      expect(e.allDay).toBe(true);
      expect(e.eind - e.start).toBeGreaterThanOrEqual(23 * 3600e3); // 1 dag (DST-veilig)
      expect(e.eind - e.start).toBeLessThanOrEqual(25 * 3600e3);
    }
  });

  it("sorteert op starttijd", () => {
    const starts = events.map((e) => e.start.getTime());
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe("parseIcsNaarEvents: randgevallen", () => {
  it("geeft een standaardtitel aan events zonder SUMMARY", () => {
    const [event] = parse(["DTSTART;VALUE=DATE:20261005", "DTEND;VALUE=DATE:20261006"]);
    expect(event.titel).toBe("(zonder titel)");
  });

  it("geeft een lege lijst voor een kalender zonder events", () => {
    expect(parse()).toEqual([]);
  });

  it("neemt events op die het bereik slechts deels overlappen", () => {
    const events = parse(
      ["DTSTART;VALUE=DATE:20260828", "DTEND;VALUE=DATE:20260903", "SUMMARY:Begin"],
      ["DTSTART;VALUE=DATE:20270629", "DTEND;VALUE=DATE:20270705", "SUMMARY:Einde"]
    );
    expect(events.map((e) => e.titel)).toEqual(["Begin", "Einde"]);
  });

  it("negeert events net buiten het bereik", () => {
    const events = parse(
      ["DTSTART:20260831T100000", "DTEND:20260831T110000", "SUMMARY:Te vroeg"],
      ["DTSTART;VALUE=DATE:20270701", "DTEND;VALUE=DATE:20270702", "SUMMARY:Te laat"]
    );
    expect(events).toEqual([]);
  });

  it("neemt events op de grenzen van het bereik op", () => {
    const events = parse(
      ["DTSTART;VALUE=DATE:20260901", "DTEND;VALUE=DATE:20260902", "SUMMARY:Eerste"],
      ["DTSTART;VALUE=DATE:20270630", "DTEND;VALUE=DATE:20270701", "SUMMARY:Laatste"]
    );
    expect(events.map((e) => e.titel)).toEqual(["Eerste", "Laatste"]);
  });

  it("zet UTC-tijden om naar Belgische tijd (zomer- en wintertijd)", () => {
    const events = parse(
      ["DTSTART:20260915T080000Z", "DTEND:20260915T090000Z", "SUMMARY:Zomer"],
      ["DTSTART:20261215T080000Z", "DTEND:20261215T090000Z", "SUMMARY:Winter"]
    );
    expect(events[0].start).toEqual(new Date(2026, 8, 15, 10, 0));
    expect(events[1].start).toEqual(new Date(2026, 11, 15, 9, 0));
  });

  it("verwerkt een DTSTART met TZID en VTIMEZONE zoals Outlook die publiceert", () => {
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:Microsoft Exchange Server 2010",
      "BEGIN:VTIMEZONE",
      "TZID:Romance Standard Time",
      "BEGIN:STANDARD",
      "DTSTART:16010101T030000",
      "TZOFFSETFROM:+0200",
      "TZOFFSETTO:+0100",
      "RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=10",
      "END:STANDARD",
      "BEGIN:DAYLIGHT",
      "DTSTART:16010101T020000",
      "TZOFFSETFROM:+0100",
      "TZOFFSETTO:+0200",
      "RRULE:FREQ=YEARLY;INTERVAL=1;BYDAY=-1SU;BYMONTH=3",
      "END:DAYLIGHT",
      "END:VTIMEZONE",
      "BEGIN:VEVENT",
      "UID:tz@test",
      "DTSTAMP:20260101T000000Z",
      "DTSTART;TZID=Romance Standard Time:20261020T140000",
      "DTEND;TZID=Romance Standard Time:20261020T153000",
      "SUMMARY:Schoolfotograaf",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const [event] = parseIcsNaarEvents(ics, START, EIND);
    expect(event.start).toEqual(new Date(2026, 9, 20, 14, 0));
    expect(event.eind).toEqual(new Date(2026, 9, 20, 15, 30));
  });

  it("verwerkt een event met DURATION i.p.v. DTEND", () => {
    const [event] = parse(["DTSTART:20261020T090000", "DURATION:PT2H", "SUMMARY:Toets"]);
    expect(event.eind).toEqual(new Date(2026, 9, 20, 11, 0));
  });

  it("gooit bij ongeldige ICS-tekst", () => {
    expect(() => parseIcsNaarEvents("dit is geen kalender", START, EIND)).toThrow();
  });
});

describe("parseIcsNaarEvents: herhalingen", () => {
  it("houdt rekening met COUNT", () => {
    const events = parse([
      "DTSTART;VALUE=DATE:20261005",
      "DTEND;VALUE=DATE:20261006",
      "RRULE:FREQ=WEEKLY;COUNT=3",
      "SUMMARY:Reeks",
    ]);
    expect(events.map((e) => e.start)).toEqual([
      new Date(2026, 9, 5),
      new Date(2026, 9, 12),
      new Date(2026, 9, 19),
    ]);
  });

  it("slaat EXDATE-uitzonderingen over", () => {
    const events = parse([
      "DTSTART;VALUE=DATE:20261005",
      "DTEND;VALUE=DATE:20261006",
      "RRULE:FREQ=WEEKLY;COUNT=3",
      "EXDATE;VALUE=DATE:20261012",
      "SUMMARY:Reeks",
    ]);
    expect(events.map((e) => e.start)).toEqual([new Date(2026, 9, 5), new Date(2026, 9, 19)]);
  });

  it("behoudt de duur van getimede herhalingen", () => {
    const events = parse([
      "DTSTART:20261006T133000",
      "DTEND:20261006T150000",
      "RRULE:FREQ=WEEKLY;COUNT=2",
      "SUMMARY:Turnen",
    ]);
    expect(events).toEqual([
      { titel: "Turnen", start: new Date(2026, 9, 6, 13, 30), eind: new Date(2026, 9, 6, 15), allDay: false },
      { titel: "Turnen", start: new Date(2026, 9, 13, 13, 30), eind: new Date(2026, 9, 13, 15), allDay: false },
    ]);
  });

});

describe("haalIcsTekstOp / haalEventsOp", () => {
  const ICS_URL = "https://outlook.office365.com/owa/calendar/x/calendar.ics";

  it("haalt de feed op met de proxy als fallback", async () => {
    const fetchMock = stubFetch((url) => (url === ICS_URL ? respons("", 500) : respons("ICS")));
    await expect(haalIcsTekstOp(ICS_URL, "/proxy")).resolves.toBe("ICS");
    expect(fetchMock.mock.calls[1][0]).toBe(`/proxy?url=${encodeURIComponent(ICS_URL)}`);
  });

  it("meldt een mislukte feed duidelijk", async () => {
    stubFetch(() => respons("", 503));
    await expect(haalIcsTekstOp(ICS_URL, "/proxy")).rejects.toThrow(
      "Ophalen van de kalenderfeed via proxy mislukt (HTTP 503). Directe fout: HTTP 503"
    );
  });

  it("haalt op en parseert in één stap", async () => {
    stubFetch(() => respons(SAMPLE_ICS));
    const events = await haalEventsOp(ICS_URL, "/proxy", START, EIND);
    expect(events[0].titel).toBe("Eerste schooldag");
    expect(events.length).toBeGreaterThan(40);
  });
});
