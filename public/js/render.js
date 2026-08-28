// Rendert de header (met huidige datum) en de 10 maanden (dagen als rijen,
// verdeeld over 2 "pagina's" van elk 5 maanden in 2 kolommen) in de DOM.

const MAANDEN_PER_PAGINA = 5;

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
    <p class="disclaimer">
      Dit is een onofficiële, automatisch samengestelde kalender en is niet goedgekeurd door basisschool Mater Dei.
      De gegevens weerspiegelen enkel de officiële schoolkalender op het
      moment van raadplegen/afdrukken en kunnen nadien gewijzigd zijn. Er
      wordt geen enkele garantie geboden op volledigheid of correctheid —
      raadpleeg steeds de officiële kanalen van de school.
    </p>
  `;
}

function escapeHtml(tekst) {
  const div = document.createElement("div");
  div.textContent = tekst;
  return div.innerHTML;
}

function renderDagRij(dag) {
  const eventTekst = dag.events.map((event) => escapeHtml(event.titel)).join("; ");

  const klassen = ["dag-rij"];
  if (dag.isVandaag) klassen.push("dag-rij--vandaag");
  if (dag.isWeekend) klassen.push("dag-rij--weekend");
  if (dag.events.length > 0) klassen.push("dag-rij--met-events");

  return `
    <div class="${klassen.join(" ")}">
      <span class="dag-nr">${dag.dagNr}</span>
      <span class="dag-weekdag">${dag.weekdagKort}</span>
      <span class="dag-events">${eventTekst}</span>
    </div>
  `;
}

function renderMaandKaart(maand) {
  const dagenHtml = maand.dagen.map(renderDagRij).join("");

  return `
    <section class="maand">
      <h2 class="maand-titel">${maand.naam} ${maand.jaar}</h2>
      <div class="dagenlijst">
        ${dagenHtml}
      </div>
    </section>
  `;
}

function renderPagina(maanden, extraKlasse) {
  const klassen = ["print-pagina"];
  if (extraKlasse) klassen.push(extraKlasse);
  return `
    <div class="${klassen.join(" ")}">
      ${maanden.map(renderMaandKaart).join("")}
    </div>
  `;
}

export function renderMaanden(container, maanden) {
  const eerstePagina = maanden.slice(0, MAANDEN_PER_PAGINA);
  const tweedePagina = maanden.slice(MAANDEN_PER_PAGINA);

  container.innerHTML =
    renderPagina(eerstePagina) + renderPagina(tweedePagina, "print-pagina--tweede");
}

const MAKER_EMAIL = "info@synvis.net";

function tekenEmailOpCanvas(canvas) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const dpr = window.devicePixelRatio || 1;
  const breedte = 130;
  const hoogte = 16;
  canvas.width = breedte * dpr;
  canvas.height = hoogte * dpr;
  canvas.style.width = `${breedte}px`;
  canvas.style.height = `${hoogte}px`;
  ctx.scale(dpr, dpr);
  ctx.font = "600 12px system-ui, sans-serif";
  ctx.fillStyle = "#6b7280";
  ctx.textBaseline = "middle";
  // Op canvas getekend (niet als tekst in de DOM aanwezig) om buiten het bereik van scrapers te blijven.
  ctx.fillText(MAKER_EMAIL, 0, hoogte / 2 + 1);
}

export function renderFooter(container) {
  container.innerHTML = `
    <p class="footer-tekst">Pagina gemaakt door Jens Geudens &mdash; <canvas class="footer-email"></canvas></p>
  `;
  tekenEmailOpCanvas(container.querySelector(".footer-email"));
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
