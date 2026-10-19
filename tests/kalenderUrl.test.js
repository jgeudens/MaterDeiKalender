import { describe, it, expect } from "vitest";
import { extraheerIcsUrl, haalIcsUrlOp, KALENDER_PAGINA_URL } from "../public/js/kalenderUrl.js";
import { respons, stubFetch } from "./helpers.js";

const OUTLOOK = "https://outlook.office365.com/owa/calendar/abc@materdei.be/def";

describe("extraheerIcsUrl", () => {
  it("zet de calendar.html-link om naar calendar.ics", () => {
    const html = `<p>Kalender</p><iframe width="100%" src="${OUTLOOK}/calendar.html" frameborder="0"></iframe>`;
    expect(extraheerIcsUrl(html)).toBe(`${OUTLOOK}/calendar.ics`);
  });

  it("behoudt een querystring", () => {
    const html = `<iframe src="${OUTLOOK}/calendar.html?view=month&x=1"></iframe>`;
    expect(extraheerIcsUrl(html)).toBe(`${OUTLOOK}/calendar.ics?view=month&x=1`);
  });

  it("aanvaardt enkele quotes en hoofdletters", () => {
    const html = `<IFRAME class='k' SRC='${OUTLOOK}/calendar.html'></IFRAME>`;
    expect(extraheerIcsUrl(html)).toBe(`${OUTLOOK}/calendar.ics`);
  });

  it("aanvaardt een attribuut over meerdere regels", () => {
    const html = `<iframe\n  title="kalender"\n  src="${OUTLOOK}/calendar.html"\n></iframe>`;
    expect(extraheerIcsUrl(html)).toBe(`${OUTLOOK}/calendar.ics`);
  });

  it("slaat andere iframes over", () => {
    const html =
      `<iframe src="https://www.youtube.com/embed/x"></iframe>` +
      `<iframe src="${OUTLOOK}/calendar.html"></iframe>`;
    expect(extraheerIcsUrl(html)).toBe(`${OUTLOOK}/calendar.ics`);
  });

  it("laat een link die al naar .ics wijst ongemoeid", () => {
    const html = `<iframe src="${OUTLOOK}/calendar.ics"></iframe>`;
    expect(extraheerIcsUrl(html)).toBe(`${OUTLOOK}/calendar.ics`);
  });

  it("matcht niet op data-src", () => {
    expect(() => extraheerIcsUrl(`<iframe data-src="${OUTLOOK}/calendar.html"></iframe>`)).toThrow();
  });

  it.each([
    ["geen iframe", "<p>niets</p>"],
    ["andere iframe", `<iframe src="https://www.youtube.com/embed/x"></iframe>`],
    ["outlook-link buiten iframe", `<a href="${OUTLOOK}/calendar.html">kalender</a>`],
    ["lege pagina", ""],
  ])("geeft een duidelijke fout bij %s", (_, html) => {
    expect(() => extraheerIcsUrl(html)).toThrow(
      `Kon geen Outlook-kalenderlink vinden op ${KALENDER_PAGINA_URL}`
    );
  });
});

describe("haalIcsUrlOp", () => {
  it("haalt de kalenderpagina op en geeft de ICS-link", async () => {
    const fetchMock = stubFetch(() => respons(`<iframe src="${OUTLOOK}/calendar.html"></iframe>`));
    await expect(haalIcsUrlOp("/proxy")).resolves.toBe(`${OUTLOOK}/calendar.ics`);
    expect(fetchMock).toHaveBeenCalledWith(KALENDER_PAGINA_URL, { cache: "no-store" });
  });

  it("gebruikt de proxy als de pagina niet rechtstreeks op te halen is", async () => {
    const fetchMock = stubFetch((url) => {
      if (url === KALENDER_PAGINA_URL) throw new TypeError("CORS");
      return respons(`<iframe src="${OUTLOOK}/calendar.html"></iframe>`);
    });
    await expect(haalIcsUrlOp("/proxy")).resolves.toBe(`${OUTLOOK}/calendar.ics`);
    expect(fetchMock.mock.calls[1][0]).toBe(`/proxy?url=${encodeURIComponent(KALENDER_PAGINA_URL)}`);
  });

  it("meldt welke bron mislukte", async () => {
    stubFetch(() => respons("", 502));
    await expect(haalIcsUrlOp("/proxy")).rejects.toThrow(
      "Ophalen van kalenderpagina via proxy mislukt (HTTP 502). Directe fout: HTTP 502"
    );
  });
});
