// Bouwt uit een platte lijst events een structuur van 10 maanden, elk als een
// lijst van dagen (dag-per-rij weergave, geen weekrooster).

import { bepaalSchooljaarMaanden, naamVanMaand } from "./config.js";

const WEEKDAG_KORT = ["zo", "ma", "di", "wo", "do", "vr", "za"]; // getDay(): 0 = zondag

function isZelfdeDag(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function maakDagenLijst(jaar, maandIndex1Based) {
  const aantalDagen = new Date(jaar, maandIndex1Based, 0).getDate();
  const dagen = [];
  for (let dagNr = 1; dagNr <= aantalDagen; dagNr++) {
    const datum = new Date(jaar, maandIndex1Based - 1, dagNr);
    dagen.push({
      datum,
      dagNr,
      weekdagKort: WEEKDAG_KORT[datum.getDay()],
      isWeekend: datum.getDay() === 0 || datum.getDay() === 6,
      events: [],
    });
  }
  return dagen;
}

// Een (mogelijk meerdaags) event over alle dagen verspreiden waarop het van toepassing is.
function voegEventToeAanDagen(dagen, event) {
  const eventStartDag = new Date(
    event.start.getFullYear(),
    event.start.getMonth(),
    event.start.getDate()
  );
  // Bij hele-dag-events is de ICS-einddatum exclusief; trek 1 ms af zodat we
  // niet per ongeluk de volgende dag meetellen.
  const eindReferentie = event.allDay ? new Date(event.eind.getTime() - 1) : event.eind;
  const eventEindDag = new Date(
    eindReferentie.getFullYear(),
    eindReferentie.getMonth(),
    eindReferentie.getDate()
  );

  for (const dag of dagen) {
    if (dag.datum >= eventStartDag && dag.datum <= eventEindDag) {
      dag.events.push(event);
    }
  }
}

export function bouwSchooljaarKalender(events, vandaag = new Date()) {
  const maanden = bepaalSchooljaarMaanden(vandaag);

  return maanden.map(({ maand, jaar }) => {
    const dagen = maakDagenLijst(jaar, maand);

    for (const event of events) {
      // Snelle voorfilter: event moet (een deel van) deze maand raken.
      const maandStart = new Date(jaar, maand - 1, 1);
      const maandEind = new Date(jaar, maand, 0, 23, 59, 59);
      if (event.eind < maandStart || event.start > maandEind) continue;
      voegEventToeAanDagen(dagen, event);
    }

    for (const dag of dagen) {
      if (isZelfdeDag(dag.datum, vandaag)) {
        dag.isVandaag = true;
      }
    }

    return {
      naam: naamVanMaand(maand),
      jaar,
      dagen,
    };
  });
}
