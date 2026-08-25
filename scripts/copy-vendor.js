// Kopieert de browser-bundel van ical.js naar public/vendor, zodat index.html
// die als gewoon <script>-tag kan laden (geen bundler nodig voor de app zelf).

const fs = require("fs");
const path = require("path");

// ical.js (v2+) levert een pure ES-module bundel (met "export default"),
// geen UMD-bundel met een globale variabele meer. We vendoren dus de
// ESM-bundel en importeren die als module in public/js/icsParser.js.
const kandidaten = ["node_modules/ical.js/dist/ical.min.js", "node_modules/ical.js/dist/ical.js"];

const bestemmingsMap = path.join(__dirname, "..", "public", "vendor");
const bestemming = path.join(bestemmingsMap, "ical.min.js");

const bron = kandidaten
  .map((p) => path.join(__dirname, "..", p))
  .find((p) => fs.existsSync(p));

if (!bron) {
  console.error(
    "Kon de ical.js browser-bundel niet vinden. Controleer of 'ical.js' correct geïnstalleerd is (npm install)."
  );
  process.exit(1);
}

fs.mkdirSync(bestemmingsMap, { recursive: true });
fs.copyFileSync(bron, bestemming);
console.log(`ical.js gekopieerd van ${bron} naar ${bestemming}`);
