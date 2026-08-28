// Same-origin proxy voor de twee externe bronnen die de app nodig heeft
// (de schoolwebsite en de Outlook-kalenderfeed). Draait als Netlify Function
// zodat de browser nooit rechtstreeks cross-origin hoeft te fetchen — dat
// omzeilt CORS-problemen volledig, in plaats van te vertrouwen op wisselvallige
// publieke CORS-proxy's.
//
// Alleen de domeinen (en daarbinnen de specifieke paden) die de app
// effectief nodig heeft zijn toegestaan, zodat dit geen open proxy wordt.
const TOEGESTANE_HOSTS = new Set([
  "www.materdeigooreind.be",
  "outlook.office365.com",
]);

const TOEGESTANE_PADEN = {
  "www.materdeigooreind.be": (pad) => pad === "/kalender",
  "outlook.office365.com": (pad) => pad.endsWith("/calendar.ics"),
};

exports.handler = async (event) => {
  const doel = event.queryStringParameters && event.queryStringParameters.url;
  if (!doel) {
    return { statusCode: 400, body: "Ontbrekende 'url'-parameter." };
  }

  let doelUrl;
  try {
    doelUrl = new URL(doel);
  } catch {
    return { statusCode: 400, body: "Ongeldige 'url'-parameter." };
  }

  if (doelUrl.protocol !== "https:" || !TOEGESTANE_HOSTS.has(doelUrl.hostname)) {
    return { statusCode: 403, body: "Dit domein is niet toegestaan." };
  }

  if (!TOEGESTANE_PADEN[doelUrl.hostname](doelUrl.pathname)) {
    return { statusCode: 403, body: "Dit pad is niet toegestaan." };
  }

  try {
    const respons = await fetch(doelUrl.toString());
    const tekst = await respons.text();
    return {
      statusCode: respons.status,
      headers: { "Content-Type": respons.headers.get("content-type") || "text/plain" },
      body: tekst,
    };
  } catch (fout) {
    return { statusCode: 502, body: `Ophalen mislukt: ${fout.message}` };
  }
};
