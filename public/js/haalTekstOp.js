// Haalt een tekstbron op: eerst rechtstreeks, en als dat mislukt (bv. door
// ontbrekende CORS-headers of een HTTP-fout) via de same-origin proxy.

export async function haalTekstOp(url, proxyEndpoint, omschrijving) {
  try {
    const respons = await fetch(url, { cache: "no-store" });
    if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
    return await respons.text();
  } catch (directeFout) {
    const proxyUrl = `${proxyEndpoint}?url=${encodeURIComponent(url)}`;
    const respons = await fetch(proxyUrl, { cache: "no-store" });
    if (!respons.ok) {
      throw new Error(
        `Ophalen van ${omschrijving} via proxy mislukt (HTTP ${respons.status}). Directe fout: ${directeFout.message}`
      );
    }
    return await respons.text();
  }
}
