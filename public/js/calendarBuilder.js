// Bouwt uit een platte lijst events een structuur van 10 maandkalendertjes
// (weken starten op maandag, zoals gebruikelijk in België).

import { bepaalSchooljaarMaanden, naamVanMaand } from "./config.js";

function isZelfdeDag(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function maakDagenRaster(jaar, maandIndex1Based) {
  const eersteVanMaand = new Date(jaar, maandIndex1Based - 1, 1);
  const laatsteVanMaand = new Date(jaar, maandIndex1Based, 0);
  const aantalDagen = laatsteVanMaand.getDate();

  // getDay(): 0 = zondag ... 6 = zaterdag. We willen maandag = 0.
  const startOffset = (eersteVanMaand.getDay() + 6) % 7;

  const dagen = [];
  for (let i = 0; i < startOffset; i++) {
    dagen.push(null); // lege cel vóór de 1e van de maand
  }
  for (let dagNr = 1; dagNr <= aantalDagen; dagNr++) {
    dagen.push({
      datum: new Date(jaar, maandIndex1Based - 1, dagNr),
      dagNr,
      events: [],
    });
  }
  while (dagen.length % 7 !== 0) {
    dagen.push(null); // lege cel na de laatste dag van de maand
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
    if (!dag) continue;
    if (dag.datum >= eventStartDag && dag.datum <= eventEindDag) {
      dag.events.push(event);
    }
  }
}

export function bouwSchooljaarKalender(events, vandaag = new Date()) {
  const maanden = bepaalSchooljaarMaanden(vandaag);

  return maanden.map(({ maand, jaar }) => {
    const dagen = maakDagenRaster(jaar, maand);

    for (const event of events) {
      // Snelle voorfilter: event moet (een deel van) deze maand raken.
      const maandStart = new Date(jaar, maand - 1, 1);
      const maandEind = new Date(jaar, maand, 0, 23, 59, 59);
      if (event.eind < maandStart || event.start > maandEind) continue;
      voegEventToeAanDagen(dagen, event);
    }

    for (const dag of dagen) {
      if (dag && isZelfdeDag(dag.datum, vandaag)) {
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
