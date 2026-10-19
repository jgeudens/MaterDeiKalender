import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  escapeHtml,
  renderHeader,
  renderMaanden,
  renderFout,
  renderFooter,
} from "../public/js/render.js";
import { bouwSchooljaarKalender } from "../public/js/calendarBuilder.js";

const VANDAAG = new Date(2026, 9, 14, 9, 5);
const XSS = `<img src=x onerror="alert(1)">`;

let container;
beforeEach(() => {
  container = document.createElement("div");
});

describe("escapeHtml", () => {
  it("escapet HTML-tekens", () => {
    expect(escapeHtml(`<b>"Tom & Jerry"</b>`)).toBe("&lt;b&gt;\"Tom &amp; Jerry\"&lt;/b&gt;");
  });

  it("laat gewone tekst ongemoeid", () => {
    expect(escapeHtml("Herfstvakantie")).toBe("Herfstvakantie");
  });
});

describe("renderHeader", () => {
  it("toont titel, datum en disclaimer", () => {
    renderHeader(container, VANDAAG);
    expect(container.querySelector("h1").textContent).toBe("Jaarkalender Mater Dei");
    const bijgewerkt = container.querySelector(".bijgewerkt strong").textContent;
    expect(bijgewerkt).toContain("14 oktober 2026");
    expect(bijgewerkt).toContain("woensdag");
    expect(bijgewerkt).toContain("09:05");
    expect(container.querySelector(".disclaimer").textContent).toContain("onofficiële");
  });

  it("toont geen filterregel zonder label", () => {
    renderHeader(container, VANDAAG);
    expect(container.querySelectorAll(".bijgewerkt")).toHaveLength(1);
    expect(container.textContent).not.toContain("Gefilterd op");
  });

  it("toont het filterlabel, ge-escaped", () => {
    renderHeader(container, VANDAAG, XSS);
    const regels = container.querySelectorAll(".bijgewerkt");
    expect(regels).toHaveLength(2);
    expect(regels[1].querySelector("strong").textContent).toBe(XSS);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("renderMaanden", () => {
  function maakKalender(events = []) {
    return bouwSchooljaarKalender(events, VANDAAG);
  }

  it("verdeelt 10 maanden over 2 bladen van 5", () => {
    renderMaanden(container, maakKalender());
    const frames = container.querySelectorAll(".print-pagina-frame");
    expect(frames).toHaveLength(2);
    expect(frames[0].classList.contains("print-pagina-frame--tweede")).toBe(false);
    expect(frames[1].classList.contains("print-pagina-frame--tweede")).toBe(true);

    const titels = [...frames].map((f) =>
      [...f.querySelectorAll(".maand-titel")].map((t) => t.textContent)
    );
    expect(titels).toEqual([
      ["september 2026", "oktober 2026", "november 2026", "december 2026", "januari 2027"],
      ["februari 2027", "maart 2027", "april 2027", "mei 2027", "juni 2027"],
    ]);
  });

  it("rendert elke dag als rij met nummer en weekdag", () => {
    renderMaanden(container, maakKalender());
    const sept = container.querySelector(".maand");
    const rijen = sept.querySelectorAll(".dag-rij");
    expect(rijen).toHaveLength(30);
    expect(rijen[0].querySelector(".dag-nr").textContent).toBe("1");
    expect(rijen[0].querySelector(".dag-weekdag").textContent).toBe("di");
    expect(container.querySelectorAll(".dag-rij")).toHaveLength(303);
  });

  it("zet de juiste klassen voor weekend, vandaag en events", () => {
    const event = { titel: "Toets", start: new Date(2026, 8, 2), eind: new Date(2026, 8, 3), allDay: true };
    renderMaanden(container, maakKalender([event]));
    const sept = container.querySelectorAll(".maand")[0].querySelectorAll(".dag-rij");
    const okt = container.querySelectorAll(".maand")[1].querySelectorAll(".dag-rij");

    expect(sept[1].classList.contains("dag-rij--met-events")).toBe(true);
    expect(sept[0].classList.contains("dag-rij--met-events")).toBe(false);
    expect(sept[4].classList.contains("dag-rij--weekend")).toBe(true); // za 5 sep
    expect(sept[0].classList.contains("dag-rij--weekend")).toBe(false);
    expect(okt[13].classList.contains("dag-rij--vandaag")).toBe(true);
    expect(container.querySelectorAll(".dag-rij--vandaag")).toHaveLength(1);
  });

  it("scheidt meerdere events met een puntkomma en escapet titels", () => {
    const dag = (titel) => ({ titel, start: new Date(2026, 8, 2), eind: new Date(2026, 8, 3), allDay: true });
    renderMaanden(container, maakKalender([dag("Toets"), dag(XSS)]));
    const cel = container.querySelectorAll(".dag-rij")[1].querySelector(".dag-events");
    expect(cel.textContent).toBe(`Toets; ${XSS}`);
    expect(container.querySelector("img")).toBeNull();
  });

  it("vervangt eerdere inhoud", () => {
    container.innerHTML = "<p class='laden'>Laden</p>";
    renderMaanden(container, maakKalender());
    expect(container.querySelector(".laden")).toBeNull();
  });
});

describe("renderFout", () => {
  it("toont de foutmelding ge-escaped", () => {
    renderFout(container, `HTTP 500 ${XSS}`);
    expect(container.querySelector(".foutmelding")).not.toBeNull();
    expect(container.textContent).toContain("De kalender kon niet geladen worden.");
    expect(container.textContent).toContain(`HTTP 500 ${XSS}`);
    expect(container.querySelector("img")).toBeNull();
  });
});

describe("renderFooter", () => {
  it("toont de maker en een canvas, zonder e-mailadres in de DOM", () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    renderFooter(container);
    expect(container.textContent).toContain("Jens Geudens");
    expect(container.querySelector("canvas.footer-email")).not.toBeNull();
    expect(container.innerHTML).not.toContain("@");
  });

  it("tekent het e-mailadres op het canvas", () => {
    const ctx = { scale: vi.fn(), fillText: vi.fn() };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(ctx);
    vi.stubGlobal("devicePixelRatio", 2);
    renderFooter(container);

    const canvas = container.querySelector("canvas");
    expect(canvas.width).toBe(260);
    expect(canvas.height).toBe(32);
    expect(canvas.style.width).toBe("130px");
    expect(ctx.scale).toHaveBeenCalledWith(2, 2);
    expect(ctx.fillText).toHaveBeenCalledWith("info@synvis.net", 0, expect.any(Number));
  });
});
