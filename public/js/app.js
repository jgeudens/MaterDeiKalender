import { PROXY_ENDPOINT, bepaalSchooljaarBereik } from "./config.js";
import { haalIcsUrlOp } from "./kalenderUrl.js";
import { haalEventsOp } from "./icsParser.js";
import { bouwSchooljaarKalender } from "./calendarBuilder.js";
import { renderHeader, renderMaanden, renderFout, renderFooter } from "./render.js";
import {
  LEERJAREN,
  filterEvents,
  leesGekozenLeerjaar,
  bewaarGekozenLeerjaar,
} from "./leerjaarFilter.js";
import "./printFit.js";

function vulLeerjaarSelect(selectEl, gekozen) {
  selectEl.innerHTML =
    `<option value="">Alle leerjaren</option>` +
    LEERJAREN.map((l) => `<option value="${l.code}">${l.label}</option>`).join("");
  selectEl.value = gekozen;
}

async function init() {
  const vandaag = new Date();
  const headerEl = document.getElementById("header");
  const maandenEl = document.getElementById("maanden");
  const footerEl = document.getElementById("footer");

  const selectEl = document.getElementById("leerjaar-filter");
  let gekozen = leesGekozenLeerjaar();
  vulLeerjaarSelect(selectEl, gekozen);

  const labelVan = (code) => LEERJAREN.find((l) => l.code === code)?.label ?? "";
  renderHeader(headerEl, vandaag, labelVan(gekozen));
  renderFooter(footerEl);
  maandenEl.innerHTML = `<p class="laden">Kalender wordt geladen...</p>`;

  try {
    const { start, eind } = bepaalSchooljaarBereik(vandaag);
    // Geen caching: bij elke pageload wordt de kalenderlink en de feed vers
    // opgehaald en geparsed.
    const icsUrl = await haalIcsUrlOp(PROXY_ENDPOINT);
    const events = await haalEventsOp(icsUrl, PROXY_ENDPOINT, start, eind);
    const toonKalender = () => {
      const maanden = bouwSchooljaarKalender(filterEvents(events, gekozen), vandaag);
      renderMaanden(maandenEl, maanden);
    };
    toonKalender();

    selectEl.addEventListener("change", () => {
      gekozen = selectEl.value;
      bewaarGekozenLeerjaar(gekozen);
      renderHeader(headerEl, vandaag, labelVan(gekozen));
      toonKalender();
    });
  } catch (fout) {
    console.error("Kon kalender niet ophalen/parsen:", fout);
    renderFout(maandenEl, fout.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
