// Haalt een ICS-feed op en parseert die met ical.js (gevendord als ES-module
// in vendor/ical.min.js) naar een platte lijst van events. Herhalende events
// (RRULE) worden uitgebreid binnen het opgegeven datumbereik.

import ICAL from "../vendor/ical.min.js";

const MAX_HERHALINGEN = 2000; // veiligheidsgrens tegen oneindige RRULE-expansie

export async function haalIcsTekstOp(icsUrl, corsProxies = []) {
  try {
    const respons = await fetch(icsUrl, { cache: "no-store" });
    if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
    return await respons.text();
  } catch (directeFout) {
    const fouten = [`directe fetch: ${directeFout.message}`];

    for (const maakProxyUrl of corsProxies) {
      try {
        const respons = await fetch(maakProxyUrl(icsUrl), { cache: "no-store" });
        if (!respons.ok) throw new Error(`HTTP ${respons.status}`);
        return await respons.text();
      } catch (proxyFout) {
        fouten.push(`proxy: ${proxyFout.message}`);
      }
    }

    throw new Error(`Ophalen van de kalenderfeed is volledig mislukt (${fouten.join("; ")}).`);
  }
}

function naarPlatEvent(titel, startTime, endTime, allDay) {
  return {
    titel: titel || "(zonder titel)",
    start: startTime.toJSDate(),
    eind: endTime.toJSDate(),
    allDay,
  };
}

export function parseIcsNaarEvents(icsTekst, bereikStart, bereikEind) {
  const jcalData = ICAL.parse(icsTekst);
  const component = new ICAL.Component(jcalData);
  const vevents = component.getAllSubcomponents("vevent");

  const bereikStartTime = ICAL.Time.fromJSDate(bereikStart, false);
  const bereikEindTime = ICAL.Time.fromJSDate(bereikEind, false);

  const events = [];

  for (const vevent of vevents) {
    const event = new ICAL.Event(vevent);

    if (event.isRecurring()) {
      const expansion = new ICAL.RecurExpansion({
        component: vevent,
        dtstart: event.startDate,
      });

      let volgende;
      let teller = 0;
      while ((volgende = expansion.next()) && teller < MAX_HERHALINGEN) {
        teller++;
        if (volgende.compare(bereikEindTime) > 0) break;
        if (volgende.compare(bereikStartTime) >= 0) {
          const eindTime = volgende.clone();
          eindTime.addDuration(event.duration);
          events.push(naarPlatEvent(event.summary, volgende, eindTime, volgende.isDate));
        }
      }
    } else {
      const start = event.startDate;
      const eind = event.endDate;
      const overlaptBereik =
        eind.compare(bereikStartTime) >= 0 && start.compare(bereikEindTime) <= 0;
      if (overlaptBereik) {
        events.push(naarPlatEvent(event.summary, start, eind, start.isDate));
      }
    }
  }

  events.sort((a, b) => a.start - b.start);
  return events;
}

export async function haalEventsOp(icsUrl, corsProxies, bereikStart, bereikEind) {
  const icsTekst = await haalIcsTekstOp(icsUrl, corsProxies);
  return parseIcsNaarEvents(icsTekst, bereikStart, bereikEind);
}
