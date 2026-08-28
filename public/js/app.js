import { PROXY_ENDPOINT, bepaalSchooljaarBereik } from "./config.js";
import { haalIcsUrlOp } from "./kalenderUrl.js";
import { haalEventsOp } from "./icsParser.js";
import { bouwSchooljaarKalender } from "./calendarBuilder.js";
import { renderHeader, renderMaanden, renderFout } from "./render.js";

async function init() {
  const vandaag = new Date();
  const headerEl = document.getElementById("header");
  const maandenEl = document.getElementById("maanden");

  renderHeader(headerEl, vandaag);
  maandenEl.innerHTML = `<p class="laden">Kalender wordt geladen...</p>`;

  try {
    const { start, eind } = bepaalSchooljaarBereik(vandaag);
    // Geen caching: bij elke pageload wordt de kalenderlink en de feed vers
    // opgehaald en geparsed.
    const icsUrl = await haalIcsUrlOp(PROXY_ENDPOINT);
    const events = await haalEventsOp(icsUrl, PROXY_ENDPOINT, start, eind);
    const maanden = bouwSchooljaarKalender(events, vandaag);
    renderMaanden(maandenEl, maanden);
  } catch (fout) {
    console.error("Kon kalender niet ophalen/parsen:", fout);
    renderFout(maandenEl, fout.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
