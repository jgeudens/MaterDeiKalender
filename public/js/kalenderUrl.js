// Haalt de gepubliceerde Outlook-kalenderlink dynamisch op vanaf de
// schoolwebsite (https://www.materdeigooreind.be/kalender bevat een iframe
// met de Outlook-link) in plaats van die link hard te coderen. Zo blijft de
// app werken als de school ooit een nieuwe kalender publiceert.

export const KALENDER_PAGINA_URL = "https://www.materdeigooreind.be/kalender";

const IFRAME_SRC_REGEX = /<iframe[^>]*\ssrc=["']([^"']*outlook\.office365\.com[^"']*)["']/i;

async function haalHtmlOp(url, corsProxy) {
  try {
    const respons = await fetch(url, { cache: "no-store" });
    if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
    return await respons.text();
  } catch (directeFout) {
    if (!corsProxy) throw directeFout;
    const proxyUrl = corsProxy + encodeURIComponent(url);
    const respons = await fetch(proxyUrl, { cache: "no-store" });
    if (!respons.ok) {
      throw new Error(
        `Ophalen van kalenderpagina via CORS-proxy mislukt (HTTP ${respons.status}). Directe fout: ${directeFout.message}`
      );
    }
    return await respons.text();
  }
}

// Zoekt de Outlook-iframe op de kalenderpagina en zet de gevonden link
// (calendar.html) om naar de bijhorende .ics-feed op hetzelfde pad.
export async function haalIcsUrlOp(corsProxy) {
  const html = await haalHtmlOp(KALENDER_PAGINA_URL, corsProxy);

  const match = html.match(IFRAME_SRC_REGEX);
  if (!match) {
    throw new Error(
      `Kon geen Outlook-kalenderlink vinden op ${KALENDER_PAGINA_URL}. Mogelijk is de website gewijzigd.`
    );
  }

  return match[1].replace(/calendar\.html(\?.*)?$/, "calendar.ics$1");
}
