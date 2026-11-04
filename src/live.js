(function () {
    /* El HTML ya viene armado desde el build. Acá se consulta la API y, si algo cambió
       (precio, estado, una propiedad nueva), se repinta sin recargar. Si la API no responde, queda lo del build. */
    var API = window.__api;
    if (!API || !window.fetch || !window.CatalogCore) return;
    var ctl = window.AbortController ? new AbortController() : null;
    var t = setTimeout(function () { if (ctl) ctl.abort(); }, 8000);
    fetch(API, {signal: ctl && ctl.signal, headers: {Accept: 'application/json'}})
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function (data) {
        clearTimeout(t);
        if (!data.items || !data.items.length) return;
        var cat = CatalogCore.render(data);
        if (window.__cat && window.__cat.sig === cat.sig) return;
        var set = function (id, html) { var el = document.getElementById(id); if (el) el.innerHTML = html; };
        set('list', cat.list); set('cats', cat.cats); set('fs-tipo', cat.chipsTipo); set('fs-dorm', cat.dorm); set('fs-zone', cat.zones);
        window.__cat = cat;
        window.Catalog.reload();
      })
      .catch(function () { clearTimeout(t); });
  })();
