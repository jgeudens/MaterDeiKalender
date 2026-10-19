import { describe, it, expect, beforeEach, vi } from "vitest";
import { pasPrintOpmaakAan, pasSchaalToe, herstelPrintOpmaak } from "../public/js/printFit.js";

// jsdom heeft geen layout: afmetingen worden gestubd.
function maakFrame(beschikbaar, benodigd) {
  const frame = document.createElement("div");
  frame.className = "print-pagina-frame";
  frame.getBoundingClientRect = () => ({ height: beschikbaar });
  const inhoud = document.createElement("div");
  inhoud.className = "print-pagina";
  Object.defineProperty(inhoud, "scrollHeight", { value: benodigd });
  frame.append(inhoud);
  document.body.append(frame);
  return { frame, inhoud };
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.style.removeProperty("--header-hoogte");
});

describe("pasSchaalToe", () => {
  it("schaalt niet als de inhoud past", () => {
    const { frame, inhoud } = maakFrame(800, 800);
    pasSchaalToe(frame);
    expect(inhoud.style.transform).toBe("none");
  });

  it("verkleint te hoge inhoud tot ze past", () => {
    const { frame, inhoud } = maakFrame(800, 1000);
    pasSchaalToe(frame);
    expect(inhoud.style.transform).toBe("scale(0.8)");
  });

  it("zet een eerdere schaal terug als de inhoud nu wel past", () => {
    const { frame, inhoud } = maakFrame(800, 500);
    inhoud.style.transform = "scale(0.5)";
    pasSchaalToe(frame);
    expect(inhoud.style.transform).toBe("none");
  });

  it("doet niets bij een frame zonder hoogte (bv. verborgen)", () => {
    const { frame, inhoud } = maakFrame(0, 1000);
    pasSchaalToe(frame);
    expect(inhoud.style.transform).toBe("none");
  });

  it("doet niets bij een frame zonder inhoud", () => {
    const frame = document.createElement("div");
    expect(() => pasSchaalToe(frame)).not.toThrow();
  });
});

describe("pasPrintOpmaakAan", () => {
  it("zet --header-hoogte en schaalt elk frame apart", () => {
    const header = document.createElement("header");
    header.className = "header";
    header.getBoundingClientRect = () => ({ height: 123.5 });
    document.body.append(header);
    const a = maakFrame(500, 1000);
    const b = maakFrame(500, 400);

    pasPrintOpmaakAan();

    expect(document.documentElement.style.getPropertyValue("--header-hoogte")).toBe("123.5px");
    expect(a.inhoud.style.transform).toBe("scale(0.5)");
    expect(b.inhoud.style.transform).toBe("none");
  });

  it("werkt zonder header", () => {
    maakFrame(500, 1000);
    expect(() => pasPrintOpmaakAan()).not.toThrow();
    expect(document.documentElement.style.getPropertyValue("--header-hoogte")).toBe("");
  });
});

describe("print-events", () => {
  it("schaalt bij beforeprint en herstelt bij afterprint", () => {
    const { inhoud } = maakFrame(500, 1000);
    window.dispatchEvent(new Event("beforeprint"));
    expect(inhoud.style.transform).toBe("scale(0.5)");
    window.dispatchEvent(new Event("afterprint"));
    expect(inhoud.style.transform).toBe("none");
  });

  it("herstelPrintOpmaak zet alle bladen terug", () => {
    const a = maakFrame(500, 1000);
    const b = maakFrame(500, 2000);
    a.inhoud.style.transform = "scale(0.5)";
    b.inhoud.style.transform = "scale(0.25)";
    herstelPrintOpmaak();
    expect(a.inhoud.style.transform).toBe("none");
    expect(b.inhoud.style.transform).toBe("none");
  });
});

it("forceert een reflow voor het meten", () => {
  const { frame, inhoud } = maakFrame(800, 1000);
  const offset = vi.fn(() => 0);
  Object.defineProperty(inhoud, "offsetHeight", { get: offset });
  pasSchaalToe(frame);
  expect(offset).toHaveBeenCalled();
});
