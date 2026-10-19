import { describe, it, expect } from "vitest";
import {
  bepaalSchooljaarMaanden,
  bepaalSchooljaarBereik,
  naamVanMaand,
  AANTAL_MAANDEN,
} from "../public/js/config.js";

describe("naamVanMaand", () => {
  it("geeft de Nederlandse maandnaam (1 = januari)", () => {
    expect(naamVanMaand(1)).toBe("januari");
    expect(naamVanMaand(6)).toBe("juni");
    expect(naamVanMaand(9)).toBe("september");
    expect(naamVanMaand(12)).toBe("december");
  });
});

describe("bepaalSchooljaarMaanden", () => {
  it("geeft september t.e.m. juni in volgorde, over de jaarwissel heen", () => {
    const maanden = bepaalSchooljaarMaanden(new Date(2026, 9, 15));
    expect(maanden).toHaveLength(AANTAL_MAANDEN);
    expect(maanden).toEqual([
      { maand: 9, jaar: 2026 },
      { maand: 10, jaar: 2026 },
      { maand: 11, jaar: 2026 },
      { maand: 12, jaar: 2026 },
      { maand: 1, jaar: 2027 },
      { maand: 2, jaar: 2027 },
      { maand: 3, jaar: 2027 },
      { maand: 4, jaar: 2027 },
      { maand: 5, jaar: 2027 },
      { maand: 6, jaar: 2027 },
    ]);
  });

  // Januari t.e.m. juni horen bij het schooljaar dat vorig jaar startte;
  // vanaf juli tonen we al het komende schooljaar.
  it.each([
    [0, 2025],
    [1, 2025],
    [2, 2025],
    [3, 2025],
    [4, 2025],
    [5, 2025],
    [6, 2026],
    [7, 2026],
    [8, 2026],
    [9, 2026],
    [10, 2026],
    [11, 2026],
  ])("maand-index %i van 2026 -> schooljaar start in %i", (maandIndex, startJaar) => {
    const maanden = bepaalSchooljaarMaanden(new Date(2026, maandIndex, 15));
    expect(maanden[0]).toEqual({ maand: 9, jaar: startJaar });
    expect(maanden.at(-1)).toEqual({ maand: 6, jaar: startJaar + 1 });
  });

  it("wisselt precies op 1 juli 00:00", () => {
    expect(bepaalSchooljaarMaanden(new Date(2026, 5, 30, 23, 59, 59))[0].jaar).toBe(2025);
    expect(bepaalSchooljaarMaanden(new Date(2026, 6, 1, 0, 0, 0))[0].jaar).toBe(2026);
  });

  it("bevat nooit juli of augustus", () => {
    const maanden = bepaalSchooljaarMaanden(new Date(2026, 0, 1)).map((m) => m.maand);
    expect(maanden).not.toContain(7);
    expect(maanden).not.toContain(8);
  });
});

describe("bepaalSchooljaarBereik", () => {
  it("loopt van 1 september 00:00 tot 30 juni 23:59:59", () => {
    const { start, eind } = bepaalSchooljaarBereik(new Date(2027, 1, 10));
    expect(start).toEqual(new Date(2026, 8, 1, 0, 0, 0));
    expect(eind).toEqual(new Date(2027, 5, 30, 23, 59, 59));
  });

  it("schuift in de zomer op naar het komende schooljaar", () => {
    const { start, eind } = bepaalSchooljaarBereik(new Date(2027, 7, 1));
    expect(start).toEqual(new Date(2027, 8, 1));
    expect(eind).toEqual(new Date(2028, 5, 30, 23, 59, 59));
  });
});
