// Rendert de header (met huidige datum) en de 10 maandkaarten in de DOM.

const WEEKDAG_KOPPEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];

function formatteerHuidigeDatumTijd(datum) {
  return datum.toLocaleString("nl-BE", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function renderHeader(container, vandaag) {
  container.innerHTML = `
    <h1>Jaarkalender Mater Dei</h1>
    <p class="bijgewerkt">Bijgewerkt op: <strong>${formatteerHuidigeDatumTijd(vandaag)}</strong></p>
  `;
}

function renderDagCel(dag) {
  if (!dag) return `<div class="dag dag--leeg"></div>`;

  const eventsHtml = dag.events
    .map((event) => `<span class="event-titel" title="${escapeHtml(event.titel)}">${escapeHtml(event.titel)}</span>`)
    .join("");

  const klassen = ["dag"];
  if (dag.isVandaag) klassen.push("dag--vandaag");
  if (dag.events.length > 0) klassen.push("dag--met-events");

  return `
    <div class="${klassen.join(" ")}">
      <span class="dag-nr">${dag.dagNr}</span>
      <div class="dag-events">${eventsHtml}</div>
    </div>
  `;
}

function escapeHtml(tekst) {
  const div = document.createElement("div");
  div.textContent = tekst;
  return div.innerHTML;
}

function renderMaandKaart(maand) {
  const weekdagKoppenHtml = WEEKDAG_KOPPEN.map((wd) => `<div class="weekdag-kop">${wd}</div>`).join("");
  const dagenHtml = maand.dagen.map(renderDagCel).join("");

  return `
    <section class="maand">
      <h2 class="maand-titel">${maand.naam} ${maand.jaar}</h2>
      <div class="maand-raster">
        ${weekdagKoppenHtml}
        ${dagenHtml}
      </div>
    </section>
  `;
}

export function renderMaanden(container, maanden) {
  container.innerHTML = maanden.map(renderMaandKaart).join("");
}

export function renderFout(container, foutmelding) {
  container.innerHTML = `
    <div class="foutmelding">
      <p><strong>De kalender kon niet geladen worden.</strong></p>
      <p>${escapeHtml(foutmelding)}</p>
      <p>Controleer de internetverbinding, of pas de instellingen in <code>public/js/config.js</code> aan.</p>
    </div>
  `;
}
