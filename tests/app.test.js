import { readFileSync } from "node:fs";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { init, vulLeerjaarSelect } from "../public/js/app.js";
import { KALENDER_PAGINA_URL } from "../public/js/kalenderUrl.js";
import { LEERJAREN } from "../public/js/leerjaarFilter.js";
import { icsKalender, projectPad, respons, stubFetch } from "./helpers.js";

const ICS_URL = "https://outlook.office365.com/owa/calendar/abc/def/calendar.ics";
const SCHOOLPAGINA = `<iframe src="${ICS_URL.replace(".ics", ".html")}"></iframe>`;
const FEED = icsKalender(
  ["DTSTART;VALUE=DATE:20261102", "DTEND;VALUE=DATE:20261107", "SUMMARY:Herfstvakantie"],
  ["DTSTART;VALUE=DATE:20261005", "DTEND;VALUE=DATE:20261006", "SUMMARY:L1_bib"],
  ["DTSTART;VALUE=DATE:20261005", "DTEND;VALUE=DATE:20261006", "SUMMARY:L2-L4_toneel"]
);

function laadPagina() {
  const html = readFileSync(projectPad("public/index.html"), "utf8");
  const body = html.match(/<body>([\s\S]*)<\/body>/)[1].replace(/<script[\s\S]*?<\/script>/g, "");
  document.body.innerHTML = body;
}

function stubBronnen({ feed = FEED } = {}) {
  return stubFetch((url) => {
    if (url === KALENDER_PAGINA_URL) return respons(SCHOOLPAGINA);
    if (url === ICS_URL) return respons(feed);
    return respons("", 404);
  });
}

const $ = (sel) => document.querySelector(sel);
const eventsOp = (maandIndex, dagNr) =>
  document.querySelectorAll(".maand")[maandIndex].querySelectorAll(".dag-events")[dagNr - 1].textContent;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 14, 8, 0));
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
  window.history.replaceState(null, "", "/");
  window.localStorage.clear();
  laadPagina();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("vulLeerjaarSelect", () => {
  it("voegt 'Alle leerjaren' en elk leerjaar toe en selecteert de keuze", () => {
    const select = document.createElement("select");
    vulLeerjaarSelect(select, "L3");
    expect([...select.options].map((o) => o.value)).toEqual(["", ...LEERJAREN.map((l) => l.code)]);
    expect(select.options[0].textContent).toBe("Alle leerjaren");
    expect(select.value).toBe("L3");
  });
});

describe("init", () => {
  it("toont een laadmelding tot de data er is", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let geefVrij;
    const fetchMock = vi.fn(async () => respons("", 500));
    fetchMock.mockImplementationOnce(() => new Promise((r) => (geefVrij = r)));
    vi.stubGlobal("fetch", fetchMock);
    const klaar = init();
    expect($(".laden").textContent).toContain("wordt geladen");
    expect($("h1").textContent).toBe("Jaarkalender Mater Dei");
    expect($(".footer-tekst")).not.toBeNull();
    geefVrij(respons("", 500));
    await klaar;
    expect($(".laden")).toBeNull();
  });

  it("haalt de link en de feed op en rendert het hele schooljaar", async () => {
    const fetchMock = stubBronnen();
    await init();

    expect(fetchMock.mock.calls.map((c) => c[0])).toEqual([KALENDER_PAGINA_URL, ICS_URL]);
    expect(document.querySelectorAll(".maand")).toHaveLength(10);
    expect(eventsOp(1, 5)).toBe("L1_bib; L2-L4_toneel");
    expect(eventsOp(2, 2)).toBe("Herfstvakantie");
    expect(eventsOp(2, 7)).toBe("");
    expect($(".dag-rij--vandaag .dag-nr").textContent).toBe("14");
    expect($("#filter-wissen").hidden).toBe(true);
    expect($("#leerjaar-filter").value).toBe("");
  });

  it("filtert op het leerjaar uit de URL", async () => {
    window.history.replaceState(null, "", "/?leerjaar=l1");
    stubBronnen();
    await init();

    expect($("#leerjaar-filter").value).toBe("L1");
    expect($("#filter-wissen").hidden).toBe(false);
    expect($(".header").textContent).toContain("Gefilterd op: Leerjaar 1 (L1)");
    expect(eventsOp(1, 5)).toBe("L1_bib");
    expect(eventsOp(2, 2)).toBe("Herfstvakantie");
  });

  it("gebruikt het onthouden leerjaar", async () => {
    window.localStorage.setItem("leerjaar", "L3");
    stubBronnen();
    await init();
    expect(eventsOp(1, 5)).toBe("L2-L4_toneel");
  });

  it("past de kalender, header, URL en opslag aan bij een andere keuze", async () => {
    stubBronnen();
    await init();

    const select = $("#leerjaar-filter");
    select.value = "L4";
    select.dispatchEvent(new Event("change"));

    expect(eventsOp(1, 5)).toBe("L2-L4_toneel");
    expect($(".header").textContent).toContain("Leerjaar 4 (L4)");
    expect(window.location.search).toBe("?leerjaar=L4");
    expect(window.localStorage.getItem("leerjaar")).toBe("L4");
    expect($("#filter-wissen").hidden).toBe(false);
  });

  it("wist de filter met de knop", async () => {
    window.history.replaceState(null, "", "/?leerjaar=L1");
    stubBronnen();
    await init();

    $("#filter-wissen").click();

    expect($("#leerjaar-filter").value).toBe("");
    expect($("#filter-wissen").hidden).toBe(true);
    expect($(".header").textContent).not.toContain("Gefilterd op");
    expect(window.location.search).toBe("");
    expect(window.localStorage.getItem("leerjaar")).toBeNull();
    expect(eventsOp(1, 5)).toBe("L1_bib; L2-L4_toneel");
  });

  it("toont een foutmelding als de kalenderpagina niet op te halen is", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubFetch(() => respons("", 500));
    await init();

    expect($(".foutmelding").textContent).toContain("Ophalen van kalenderpagina via proxy mislukt (HTTP 500)");
    expect(document.querySelectorAll(".maand")).toHaveLength(0);
    expect(console.error).toHaveBeenCalled();
  });

  it("toont een foutmelding bij een onleesbare feed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    stubBronnen({ feed: "geen ics" });
    await init();
    expect($(".foutmelding")).not.toBeNull();
  });
});
