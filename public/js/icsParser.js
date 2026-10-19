// Haalt een ICS-feed op en parseert die met ical.js (gevendord als ES-module
// in vendor/ical.min.js) naar een platte lijst van events. Herhalende events
// (RRULE) worden uitgebreid binnen het opgegeven datumbereik.

import ICAL from "../vendor/ical.min.js";
import { haalTekstOp } from "./haalTekstOp.js";

const MAX_ITERATIES = 100000; // veiligheidsgrens tegen oneindige RRULE-expansie

export function haalIcsTekstOp(icsUrl, proxyEndpoint) {
  return haalTekstOp(icsUrl, proxyEndpoint, "de kalenderfeed");
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
  const alleEvents = component.getAllSubcomponents("vevent").map((vevent) => new ICAL.Event(vevent));

  const bereikStartTime = ICAL.Time.fromJSDate(bereikStart, false);
  const bereikEindTime = ICAL.Time.fromJSDate(bereikEind, false);
  // Het einde van een ICS-event is exclusief: een event dat eindigt op het
  // begin van het bereik valt erbuiten.
  const overlaptBereik = (start, eind) =>
    (eind.compare(bereikStartTime) > 0 || start.compare(bereikStartTime) >= 0) &&
    start.compare(bereikEindTime) <= 0;

  // Een gewijzigde/verplaatste herhaling staat als apart VEVENT met dezelfde
  // UID en een RECURRENCE-ID. Die koppelen we aan de reeks, zodat ze de
  // oorspronkelijke herhaling vervangt in plaats van ernaast te verschijnen.
  const reeksen = new Map();
  for (const event of alleEvents) {
    if (event.isRecurring()) reeksen.set(event.uid, event);
  }
  const hoofdEvents = alleEvents.filter((event) => {
    if (!event.isRecurrenceException()) return true;
    const reeks = reeksen.get(event.uid);
    if (!reeks) return true;
    reeks.relateException(event);
    return false;
  });

  const events = [];

  for (const event of hoofdEvents) {
    if (event.isRecurring()) {
      const iterator = event.iterator();
      let volgende;
      let teller = 0;
      // Herhalingen van voor het bereik worden ook overlopen (niet alleen
      // geteld), zodat een reeks die al jaren loopt toch zichtbaar blijft.
      while ((volgende = iterator.next()) && teller++ < MAX_ITERATIES) {
        if (volgende.compare(bereikEindTime) > 0) break;
        const { item, startDate, endDate } = event.getOccurrenceDetails(volgende);
        if (overlaptBereik(startDate, endDate)) {
          events.push(naarPlatEvent(item.summary, startDate, endDate, startDate.isDate));
        }
      }
    } else if (overlaptBereik(event.startDate, event.endDate)) {
      events.push(naarPlatEvent(event.summary, event.startDate, event.endDate, event.startDate.isDate));
    }
  }

  events.sort((a, b) => a.start - b.start);
  return events;
}

export async function haalEventsOp(icsUrl, proxyEndpoint, bereikStart, bereikEind) {
  const icsTekst = await haalIcsTekstOp(icsUrl, proxyEndpoint);
  return parseIcsNaarEvents(icsTekst, bereikStart, bereikEind);
}
