// Arma dist/ : HTML con las tarjetas ya pintadas a partir de la API de Rentia.
// Si la API no responde o todavía no tiene micrositios, usa data/snapshot.json.
import {readFileSync, writeFileSync, mkdirSync, rmSync, cpSync} from 'node:fs';

const API = process.env.CATALOG_API || 'https://api.rentia.com.ar/api/v1/property/public/microsites';
await import('./src/core.js'); // se registra en globalThis.CatalogCore
const core = globalThis.CatalogCore;
const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8');

async function load() {
  try {
    const res = await fetch(API, {signal: AbortSignal.timeout(15000), headers: {Accept: 'application/json'}});
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    if (!data.items?.length) throw new Error('la API no devolvió micrositios');
    console.log(`API: ${data.items.length} micrositios`);
    return data;
  } catch (err) {
    console.warn(`API no disponible (${err.message}); se usa data/snapshot.json`);
    return JSON.parse(read('data/snapshot.json'));
  }
}

const data = await load();
const cat = core.render(data);
const {list: _l, cats: _c, chipsTipo: _t, dorm: _d, zones: _z, ...meta} = cat; // lo que ya está en el HTML no se repite
const fill = {
  CSS: read('src/styles.css'), LIST: cat.list, CATS: cat.cats, CHIPS_TIPO: cat.chipsTipo, DORM: cat.dorm, ZONES: cat.zones,
  CORE_JS: read('src/core.js'),
  CALC_JS: read('src/calc.js'),
  APP_JS: `window.__cat = ${JSON.stringify(meta)};\nwindow.__api = ${JSON.stringify(API)};\n` + read('src/app.js'),
  MAP_JS: read('src/map.js'),
  LIVE_JS: read('src/live.js'),
};
let html = read('src/template.html');
for (const [key, value] of Object.entries(fill)) html = html.replace(`{{${key}}}`, () => value);
if (/\{\{[A-Z_]+\}\}/.test(html)) throw new Error('quedaron marcadores sin reemplazar');
// secciones de filtro que no aportan con estos datos
if (cat.dormHidden) html = html.replace('<section id="fs-dorm-sec">', '<section id="fs-dorm-sec" hidden>');
if (cat.zonesHidden) html = html.replace('<section id="fs-zone-sec">', '<section id="fs-zone-sec" hidden>');

const out = new URL('./dist/', import.meta.url);
rmSync(out, {recursive: true, force: true});
mkdirSync(out, {recursive: true});
cpSync(new URL('./static/', import.meta.url), out, {recursive: true});
writeFileSync(new URL('index.html', out), html);
console.log(`dist/index.html · ${cat.count} propiedades · ${(html.length / 1024).toFixed(0)} KB`);
