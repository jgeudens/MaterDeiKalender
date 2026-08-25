import { ICS_URL, CORS_PROXY, bepaalSchooljaarBereik } from "./config.js";
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
    // Geen caching: bij elke pageload wordt de feed vers opgehaald en geparsed.
    const events = await haalEventsOp(ICS_URL, CORS_PROXY, start, eind);
    const maanden = bouwSchooljaarKalender(events, vandaag);
    renderMaanden(maandenEl, maanden);
  } catch (fout) {
    console.error("Kon kalender niet ophalen/parsen:", fout);
    renderFout(maandenEl, fout.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
