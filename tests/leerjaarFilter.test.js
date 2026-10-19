import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  LEERJAREN,
  bepaalDoelgroepen,
  isZichtbaar,
  filterEvents,
  leesGekozenLeerjaar,
  bewaarGekozenLeerjaar,
} from "../public/js/leerjaarFilter.js";

const ALLE_L = ["L1", "L2", "L3", "L4", "L5", "L6"];

function sorteer(set) {
  return set === null ? null : [...set].sort();
}

function maakOpslag(begin = {}) {
  const data = new Map(Object.entries(begin));
  return {
    getItem: vi.fn((k) => (data.has(k) ? data.get(k) : null)),
    setItem: vi.fn((k, v) => data.set(k, String(v))),
    removeItem: vi.fn((k) => data.delete(k)),
    data,
  };
}

function gooiendeOpslag() {
  const fout = () => {
    throw new Error("SecurityError");
  };
  return { getItem: fout, setItem: fout, removeItem: fout };
}

describe("LEERJAREN", () => {
  it("bevat IK, K1-K3 en L1-L6 met een label", () => {
    expect(LEERJAREN.map((l) => l.code)).toEqual(["IK", "K1", "K2", "K3", ...ALLE_L]);
    for (const { code, label } of LEERJAREN) expect(label).toContain(`(${code})`);
  });
});

describe("bepaalDoelgroepen", () => {
  it.each([
    // Prefix voor "_"
    ["L1_bib", ["L1"]],
    ["L1, L2 en L3_bib", ["L1", "L2", "L3"]],
    ["L5B_uitstap", ["L5"]],
    ["L5A en L5B_zwemmen", ["L5"]],
    ["IK_wenmoment", ["IK"]],
    ["IK en K1_poppenkast", ["IK", "K1"]],
    // Prefix voor ":"
    ["L1: uitstap naar de zoo", ["L1"]],
    ["K3: bezoek L1", ["K3"]],
    // Reeksen
    ["L2-L6_sportdag", ["L2", "L3", "L4", "L5", "L6"]],
    ["L2 - L4_toneel", ["L2", "L3", "L4"]],
    ["K1-K2-K3_kleuterfeest", ["K1", "K2", "K3"]],
    ["L4-6_zeeklassen", ["L4", "L5", "L6"]],
    ["L6-L4_omgekeerd", ["L4", "L5", "L6"]],
    // Uitsluitingen
    ["KS (niet K3)_uitstap", ["IK", "K1", "K2"]],
    ["KS(niet IK)_turnen", ["K1", "K2", "K3"]],
    ["LS (niet L1-L2)_film", ["L3", "L4", "L5", "L6"]],
    ["ls (niet L6)_bosklassen", ["L1", "L2", "L3", "L4", "L5"]],
    // "_" heeft voorrang op ":"
    ["L2_bezoek: L5", ["L2"]],
  ])("%s -> %j", (titel, verwacht) => {
    expect(sorteer(bepaalDoelgroepen(titel))).toEqual([...verwacht].sort());
  });

  it.each([
    "KS_schoolfeest",
    "LS_schoolfeest",
    "KS/LS_schoolfeest",
    "Herfstvakantie",
    "Oudercontact L6", // codes buiten de prefix tellen niet
    "Opendeurdag: info voor L1",
    "L7_bestaat niet",
    "XL1_geen woordgrens",
    "_leeg prefix",
    "",
  ])("%s is algemeen (null)", (titel) => {
    expect(bepaalDoelgroepen(titel)).toBeNull();
  });
});

describe("isZichtbaar", () => {
  it("toont alles zonder gekozen leerjaar", () => {
    expect(isZichtbaar({ titel: "L1_bib" }, "")).toBe(true);
  });

  it("toont events voor het gekozen leerjaar en algemene events", () => {
    expect(isZichtbaar({ titel: "L1_bib" }, "L1")).toBe(true);
    expect(isZichtbaar({ titel: "L1_bib" }, "L2")).toBe(false);
    expect(isZichtbaar({ titel: "Herfstvakantie" }, "L2")).toBe(true);
  });

  it("onthoudt de berekende doelgroepen op het event", () => {
    const event = { titel: "L1_bib" };
    isZichtbaar(event, "L1");
    expect(sorteer(event.doelgroepen)).toEqual(["L1"]);

    // Daarna wordt de cache gebruikt, niet opnieuw de titel.
    event.titel = "L2_bib";
    expect(isZichtbaar(event, "L2")).toBe(false);
  });
});

describe("filterEvents", () => {
  const events = [
    { titel: "L1_bib" },
    { titel: "L2-L3_toneel" },
    { titel: "Herfstvakantie" },
    { titel: "KS (niet K3)_uitstap" },
  ];

  it("geeft dezelfde array terug zonder keuze", () => {
    expect(filterEvents(events, "")).toBe(events);
  });

  it.each([
    ["L1", ["L1_bib", "Herfstvakantie"]],
    ["L3", ["L2-L3_toneel", "Herfstvakantie"]],
    ["K2", ["Herfstvakantie", "KS (niet K3)_uitstap"]],
    ["K3", ["Herfstvakantie"]],
  ])("filtert op %s", (code, verwacht) => {
    expect(filterEvents(events, code).map((e) => e.titel)).toEqual(verwacht);
  });
});

describe("leesGekozenLeerjaar", () => {
  it("neemt de URL-parameter (hoofdletterongevoelig)", () => {
    expect(leesGekozenLeerjaar("?leerjaar=l3", maakOpslag())).toBe("L3");
    expect(leesGekozenLeerjaar("?x=1&leerjaar=IK", maakOpslag())).toBe("IK");
  });

  it("laat de URL-parameter voorgaan op de opslag", () => {
    expect(leesGekozenLeerjaar("?leerjaar=L2", maakOpslag({ leerjaar: "L5" }))).toBe("L2");
  });

  it("geeft leeg terug bij een ongeldige of lege URL-parameter, zonder opslag te raadplegen", () => {
    const opslag = maakOpslag({ leerjaar: "L5" });
    expect(leesGekozenLeerjaar("?leerjaar=L9", opslag)).toBe("");
    expect(leesGekozenLeerjaar("?leerjaar=", opslag)).toBe("");
    expect(opslag.getItem).not.toHaveBeenCalled();
  });

  it("valt terug op de opslag", () => {
    expect(leesGekozenLeerjaar("", maakOpslag({ leerjaar: "K1" }))).toBe("K1");
  });

  it("negeert een ongeldige waarde in de opslag", () => {
    expect(leesGekozenLeerjaar("", maakOpslag({ leerjaar: "l1" }))).toBe("");
    expect(leesGekozenLeerjaar("", maakOpslag({ leerjaar: "rommel" }))).toBe("");
  });

  it("geeft leeg terug zonder URL of opslag", () => {
    expect(leesGekozenLeerjaar("", maakOpslag())).toBe("");
    expect(leesGekozenLeerjaar("", null)).toBe("");
  });

  it("overleeft een geblokkeerde opslag", () => {
    expect(leesGekozenLeerjaar("", gooiendeOpslag())).toBe("");
  });

  it("leest standaard uit window.location en localStorage", () => {
    window.history.replaceState(null, "", "/?leerjaar=L4");
    expect(leesGekozenLeerjaar()).toBe("L4");
    window.history.replaceState(null, "", "/");
    window.localStorage.setItem("leerjaar", "K2");
    expect(leesGekozenLeerjaar()).toBe("K2");
    window.localStorage.clear();
  });
});

describe("bewaarGekozenLeerjaar", () => {
  beforeEach(() => {
    window.history.replaceState(null, "", "/?andere=1");
  });

  it("zet de URL-parameter en de opslag", () => {
    const opslag = maakOpslag();
    bewaarGekozenLeerjaar("L3", opslag);
    expect(window.location.search).toBe("?andere=1&leerjaar=L3");
    expect(opslag.data.get("leerjaar")).toBe("L3");
  });

  it("verwijdert de URL-parameter en de opslag bij een lege keuze", () => {
    const opslag = maakOpslag({ leerjaar: "L3" });
    window.history.replaceState(null, "", "/?leerjaar=L3&andere=1");
    bewaarGekozenLeerjaar("", opslag);
    expect(window.location.search).toBe("?andere=1");
    expect(opslag.data.has("leerjaar")).toBe(false);
  });

  it("past de URL aan zonder history-item toe te voegen", () => {
    const lengte = window.history.length;
    bewaarGekozenLeerjaar("L1", maakOpslag());
    expect(window.history.length).toBe(lengte);
  });

  it("overleeft een geblokkeerde of ontbrekende opslag", () => {
    expect(() => bewaarGekozenLeerjaar("L1", gooiendeOpslag())).not.toThrow();
    expect(() => bewaarGekozenLeerjaar("", null)).not.toThrow();
    expect(window.location.search).toBe("?andere=1");
  });

  it("gebruikt standaard window.localStorage", () => {
    bewaarGekozenLeerjaar("L6");
    expect(window.localStorage.getItem("leerjaar")).toBe("L6");
    bewaarGekozenLeerjaar("");
    expect(window.localStorage.getItem("leerjaar")).toBeNull();
  });
});
