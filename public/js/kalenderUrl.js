// Haalt de gepubliceerde Outlook-kalenderlink dynamisch op vanaf de
// schoolwebsite (https://www.materdeigooreind.be/kalender bevat een iframe
// met de Outlook-link) in plaats van die link hard te coderen. Zo blijft de
// app werken als de school ooit een nieuwe kalender publiceert.

import { haalTekstOp } from "./haalTekstOp.js";

export const KALENDER_PAGINA_URL = "https://www.materdeigooreind.be/kalender";

const IFRAME_SRC_REGEX = /<iframe[^>]*\ssrc=["']([^"']*outlook\.office365\.com[^"']*)["']/i;

// Zoekt de Outlook-iframe in de HTML van de kalenderpagina en zet de gevonden
// link (calendar.html) om naar de bijhorende .ics-feed op hetzelfde pad.
export function extraheerIcsUrl(html) {
  const match = html.match(IFRAME_SRC_REGEX);
  if (!match) {
    throw new Error(
      `Kon geen Outlook-kalenderlink vinden op ${KALENDER_PAGINA_URL}. Mogelijk is de website gewijzigd.`
    );
  }

  return match[1].replace(/calendar\.html(\?.*)?$/, "calendar.ics$1");
}

export async function haalIcsUrlOp(proxyEndpoint) {
  const html = await haalTekstOp(KALENDER_PAGINA_URL, proxyEndpoint, "kalenderpagina");
  return extraheerIcsUrl(html);
}
