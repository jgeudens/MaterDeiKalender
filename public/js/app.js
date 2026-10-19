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

export function vulLeerjaarSelect(selectEl, gekozen) {
  selectEl.innerHTML =
    `<option value="">Alle leerjaren</option>` +
    LEERJAREN.map((l) => `<option value="${l.code}">${l.label}</option>`).join("");
  selectEl.value = gekozen;
}

export async function init() {
  const vandaag = new Date();
  const headerEl = document.getElementById("header");
  const maandenEl = document.getElementById("maanden");
  const footerEl = document.getElementById("footer");

  const selectEl = document.getElementById("leerjaar-filter");
  const wisKnop = document.getElementById("filter-wissen");
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

    const pasFilterToe = (code) => {
      gekozen = code;
      selectEl.value = code;
      wisKnop.hidden = !code;
      bewaarGekozenLeerjaar(code);
      renderHeader(headerEl, vandaag, labelVan(code));
      toonKalender();
    };

    wisKnop.hidden = !gekozen;
    selectEl.addEventListener("change", () => pasFilterToe(selectEl.value));
    wisKnop.addEventListener("click", () => pasFilterToe(""));
  } catch (fout) {
    console.error("Kon kalender niet ophalen/parsen:", fout);
    renderFout(maandenEl, fout.message);
  }
}

document.addEventListener("DOMContentLoaded", init);
