# propiedades.ipropietas.com.ar

Catálogo de micrositios de Propietas Inmobiliaria. Los datos salen de la API de Rentia:

`GET https://api.rentia.com.ar/api/v1/property/public/microsites`

Una propiedad aparece acá cuando en el backoffice (ficha → Micrositio) tiene URL y un estado distinto de "Oculto".

## Cómo funciona (híbrido)
1. **Build** (`node build.mjs`): consulta la API y genera `dist/index.html` con las tarjetas y los filtros ya pintados. Si la API no responde o no trae micrositios, usa `data/snapshot.json`.
2. **Navegador**: al abrir, vuelve a consultar la API y, si algo cambió (precio, estado, propiedad nueva), repinta sin recargar. Si falla, queda lo del build.

Los filtros (tipo, dormitorios, zona, escalones de precio) se calculan de los datos; no hay listas escritas a mano.

## Estados
`DISPONIBLE_ALQUILER`, `DISPONIBLE_VENTA`, `DISPONIBLE_ALQUILER_VENTA` → tarjeta normal. `ALQUILADA`, `VENDIDA` → tarjeta con cartel, sin precio ni calculadora, al final de la lista. `OCULTA` → no se muestra.

## Estructura
- `src/core.js` — convierte la respuesta de la API en tarjetas y filtros (lo usan el build y el navegador).
- `src/template.html`, `styles.css`, `app.js` (filtros), `map.js` (Leaflet), `calc.js` (calculadora), `live.js` (refresco).
- `static/` — fuentes, logo, Leaflet y fotos del snapshot. Se copia tal cual a `dist/`.
- `data/snapshot.json` — respaldo con el formato de la API.

## Publicar
`vercel deploy --prod --yes` (proyecto `propietas-links`; corre el build). Para que un cambio en Rentia se refleje sin tocar nada, el navegador ya lo trae en vivo; el redeploy sólo mejora la carga inicial y el SEO.

## Redeploy automático
Crear en Vercel (proyecto `propietas-links` → Settings → Git → Deploy Hooks) un hook y cargarlo en el backend como `CATALOG_DEPLOY_HOOK_URL`. Cuando alguien edita un micrositio en el backoffice, Rentia dispara un único redeploy 30 s después del último cambio.

`CATALOG_API=<url> node build.mjs` apunta el build a otra API (por ejemplo local).
