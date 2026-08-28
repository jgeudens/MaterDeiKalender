// Haalt de gepubliceerde Outlook-kalenderlink dynamisch op vanaf de
// schoolwebsite (https://www.materdeigooreind.be/kalender bevat een iframe
// met de Outlook-link) in plaats van die link hard te coderen. Zo blijft de
// app werken als de school ooit een nieuwe kalender publiceert.

export const KALENDER_PAGINA_URL = "https://www.materdeigooreind.be/kalender";

const IFRAME_SRC_REGEX = /<iframe[^>]*\ssrc=["']([^"']*outlook\.office365\.com[^"']*)["']/i;

async function haalHtmlOp(url, corsProxies = []) {
  try {
    const respons = await fetch(url, { cache: "no-store" });
    if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
    return await respons.text();
  } catch (directeFout) {
    const fouten = [`directe fetch: ${directeFout.message}`];

    for (const maakProxyUrl of corsProxies) {
      try {
        const respons = await fetch(maakProxyUrl(url), { cache: "no-store" });
        if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
        return await respons.text();
      } catch (proxyFout) {
        fouten.push(`proxy: ${proxyFout.message}`);
      }
    }

    throw new Error(`Ophalen van de kalenderpagina is volledig mislukt (${fouten.join("; ")}).`);
  }
}

// Zoekt de Outlook-iframe op de kalenderpagina en zet de gevonden link
// (calendar.html) om naar de bijhorende .ics-feed op hetzelfde pad.
export async function haalIcsUrlOp(corsProxies) {
  const html = await haalHtmlOp(KALENDER_PAGINA_URL, corsProxies);

  const match = html.match(IFRAME_SRC_REGEX);
  if (!match) {
    throw new Error(
      `Kon geen Outlook-kalenderlink vinden op ${KALENDER_PAGINA_URL}. Mogelijk is de website gewijzigd.`
    );
  }

  return match[1].replace(/calendar\.html(\?.*)?$/, "calendar.ics$1");
}
