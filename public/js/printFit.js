// Zorgt dat de kalender altijd op precies 2 A4-bladen past, ook als er meer
// maanden-inhoud (events) is dan waarmee de opmaak in style.css getest werd.
//
// .print-pagina-frame heeft in style.css een vaste, aan de fysieke pagina
// gekoppelde hoogte (zie daar) en overflow:hidden. Vlak voor het afdrukken
// meten we hier hoeveel hoogte de echte inhoud (.print-pagina) nodig heeft
// en verkleinen we die met transform: scale() tot ze in het frame past, in
// plaats van dat overtollige maanden stilzwijgend naar een volgend blad
// (of buiten het blad) verschuiven.

function pasHeaderHoogteAan() {
  const header = document.querySelector(".header");
  if (!header) return;
  document.documentElement.style.setProperty(
    "--header-hoogte",
    `${header.getBoundingClientRect().height}px`
  );
}

function pasSchaalToe(frame) {
  const inhoud = frame.querySelector(".print-pagina");
  if (!inhoud) return;

  inhoud.style.transform = "none";
  // Forceer een reflow zodat de frame-hoogte (die van --header-hoogte
  // afhangt) en de ongeschaalde inhoud-hoogte allebei up-to-date zijn
  // voordat we ze aflezen.
  void inhoud.offsetHeight;

  const beschikbareHoogte = frame.getBoundingClientRect().height;
  const benodigdeHoogte = inhoud.scrollHeight;
  if (beschikbareHoogte <= 0 || benodigdeHoogte <= beschikbareHoogte) return;

  const schaal = beschikbareHoogte / benodigdeHoogte;
  inhoud.style.transform = `scale(${schaal})`;
}

export function pasPrintOpmaakAan() {
  pasHeaderHoogteAan();
  document.querySelectorAll(".print-pagina-frame").forEach(pasSchaalToe);
}

function herstelPrintOpmaak() {
  document.querySelectorAll(".print-pagina").forEach((inhoud) => {
    inhoud.style.transform = "none";
  });
}

window.addEventListener("beforeprint", pasPrintOpmaakAan);
window.addEventListener("afterprint", herstelPrintOpmaak);
