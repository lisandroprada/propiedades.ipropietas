/* Núcleo compartido: lo usa build.mjs (Node) y el navegador. Convierte la respuesta de
   GET /api/v1/property/public/microsites en las tarjetas y los controles de filtro. */
(function (root) {
  var GROUPS = [
    {key: 'casa', label: 'Casas', long: 'Casas', icon: 'casa', types: ['CASA', 'PH', 'QUINTA']},
    {key: 'departamento', label: 'Deptos', long: 'Departamentos', icon: 'departamento', types: ['DEPARTAMENTO', 'LOFT', 'ESTUDIO']},
    {key: 'duplex', label: 'Dúplex', long: 'Dúplex', icon: 'duplex', types: ['DUPLEX', 'TRIPLEX']},
    {key: 'campo', label: 'Campos', long: 'Campos', icon: 'campo', types: ['CHACRA']},
    {key: 'lote', label: 'Lotes', long: 'Lotes', icon: 'campo', types: ['LOTE']},
    {key: 'comercial', label: 'Comercial', long: 'Comercial', icon: 'departamento', types: ['LOCAL_COMERCIAL', 'OFICINA', 'GALPON', 'NAVE_INDUSTRIAL']},
    {key: 'otros', label: 'Otros', long: 'Otros', icon: 'casa', types: []}
  ];
  var ICON = {
    todo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/></svg>',
    casa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/><path d="M10 20v-5.5h4V20"/></svg>',
    departamento: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 21V4h9v17"/><path d="M14 9h5v12"/><path d="M8 8h3M8 12h3M8 16h3"/><path d="M3 21h18"/></svg>',
    duplex: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11l4.5-4 4.5 4"/><path d="M12 11l4.5-4 4.5 4"/><path d="M4.5 10.5V20h6v-9.5M13.5 10.5V20h6v-9.5"/></svg>',
    campo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21v-6"/><path d="M12 15c-4 0-6-3-6-6 0-2 1.5-4.5 6-6 4.5 1.5 6 4 6 6 0 3-2 6-6 6Z"/></svg>'
  };
  var OFF = {ALQUILADA: 'Alquilada', VENDIDA: 'Vendida'};

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return {'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]; });
  }
  function money(n) { return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function slug(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  }
  function group(type) {
    for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i].types.indexOf(type) > -1) return GROUPS[i];
    return GROUPS[GROUPS.length - 1];
  }
  function plural(n, one, many) { return n + ' ' + (n === 1 ? one : many); }

  /* una propiedad de la API → lo que necesita la tarjeta */
  function view(p) {
    var ms = p.microsite || {}, specs = p.specs || {};
    var ops = ms.available ? (ms.operations || []).map(function (o) { return o === 'rent' ? 'alquiler' : 'venta'; }) : [];
    var rent = ops.indexOf('alquiler') > -1 && p.valueForRent ? p.valueForRent : null;
    var sale = ops.indexOf('venta') > -1 && p.valueForSale ? p.valueForSale : null;
    var det = p.summary;
    if (!det) {
      var bits = [];
      if (specs.bedrooms) bits.push(plural(specs.bedrooms, 'dormitorio', 'dormitorios'));
      if (specs.bathrooms) bits.push(plural(specs.bathrooms, 'baño', 'baños'));
      if (specs.garageCount) bits.push('cochera');
      var m2 = specs.coveredSquareMeters || specs.totalSquareMeters;
      if (m2) bits.push(Math.round(m2) + ' m²');
      det = bits.join(' · ');
    }
    var city = p.locality && p.locality.name;
    var g = group(p.type);
    var tag;
    if (ms.available) tag = ops.length > 1 ? ['alq', 'Alquiler y venta'] : ops[0] === 'alquiler' ? ['alq', 'Alquiler'] : ['ven', 'Venta'];
    else tag = ['off', OFF[ms.status] || 'No disponible'];
    var price;
    if (!ms.available) price = '<span>Ya no está disponible</span>';
    else if (rent) price = '<strong>' + esc(rent.currency) + ' ' + money(rent.amount) + '</strong> <span>por mes</span>' + (sale ? ' <span>· venta ' + esc(sale.currency) + ' ' + money(sale.amount) + '</span>' : '');
    else if (sale) price = '<strong>' + esc(sale.currency) + ' ' + money(sale.amount) + '</strong>';
    else price = '<strong>Consultar valor</strong>';
    return {
      id: p._id, href: ms.url, title: p.title, loc: [p.address, city].filter(Boolean).join(', '), det: det,
      img: p.imgCover && p.imgCover.thumbWeb, alt: (p.imgCover && p.imgCover.alt) || p.title,
      ops: ops, off: !ms.available, tag: tag, price: price,
      pl: city ? {slug: slug(city), name: city} : null, tipo: g,
      dorm: specs.bedrooms || 0, pr: rent ? Math.round(rent.amount) : null, pv: sale ? Math.round(sale.amount) : null,
      rentCur: rent && rent.currency, lat: p.lat, lng: p.lng
    };
  }

  function views(data) {
    var list = (data.items || []).filter(function (p) { return p.microsite && p.microsite.url; }).map(view);
    return list.filter(function (v) { return !v.off; }).concat(list.filter(function (v) { return v.off; })); // disponibles primero
  }

  function li(v) {
    var attrs = ' data-op="' + v.ops.join(' ') + '"' + (v.pl ? ' data-pl="' + v.pl.slug + '"' : '') + ' data-tipo="' + v.tipo.key + '" data-dorm="' + v.dorm + '"' +
      (v.pr ? ' data-pr="' + v.pr + '"' : '') + (v.pv ? ' data-pv="' + v.pv + '"' : '') +
      (v.lat != null && v.lng != null ? ' data-lat="' + v.lat + '" data-lng="' + v.lng + '"' : '') + (v.off ? ' data-off' : '');
    return '<li' + attrs + '><article class="card' + (v.off ? ' card--off' : '') + '"><a class="card-link" href="' + esc(v.href) + '">' +
      '<div class="card-media">' + (v.img ? '<img src="' + esc(v.img) + '" width="900" height="720" loading="lazy" decoding="async" alt="' + esc(v.alt) + '">' : '') +
      '<span class="tag tag--' + v.tag[0] + '"><i></i>' + esc(v.tag[1]) + '</span></div>' +
      '<div class="card-body"><h2>' + esc(v.title) + '</h2><p class="loc">' + esc(v.loc) + '</p>' + (v.det ? '<p class="det">' + esc(v.det) + '</p>' : '') +
      '<p class="price">' + v.price + '</p></div></a>' +
      (v.pr ? '<button type="button" class="calc-btn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h.01M16 18h.01"/></svg>Calculadora de condiciones</button>' : '') +
      '</article></li>';
  }

  /* precios máximos sugeridos: tres escalones "redondos" que cubren los valores reales */
  function nice(n) {
    var p = Math.pow(10, Math.floor(Math.log(n) / Math.LN10)), x = n / p;
    var steps = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 10];
    for (var i = 0; i < steps.length; i++) if (x <= steps[i] + 1e-9) return steps[i] * p;
    return 10 * p;
  }
  function presets(values) {
    var v = values.filter(Boolean).sort(function (a, b) { return a - b; });
    if (!v.length) return [];
    var out = [];
    [0.34, 0.67, 1].forEach(function (q) {
      var n = nice(v[Math.max(0, Math.ceil(q * v.length) - 1)]);
      if (out.indexOf(n) < 0) out.push(n);
    });
    return out;
  }

  function btn(g, v, label, pressed, extra) {
    return '<button type="button" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '">' + (extra || '') + '<span>' + esc(label) + '</span></button>';
  }
  function chip(g, v, label, pressed) {
    return '<button type="button" data-g="' + g + '" data-v="' + esc(v) + '" aria-pressed="' + (pressed ? 'true' : 'false') + '">' + esc(label) + '</button>';
  }

  /* HTML de todo lo que depende de los datos */
  function render(data) {
    var vs = views(data);
    var avail = vs.filter(function (v) { return !v.off; });
    var groups = GROUPS.filter(function (g) { return vs.some(function (v) { return v.tipo === g; }); });
    var zones = [], seen = {};
    vs.forEach(function (v) { if (v.pl && !seen[v.pl.slug]) { seen[v.pl.slug] = 1; zones.push(v.pl); } });
    zones.sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    var maxDorm = Math.max.apply(null, [0].concat(vs.map(function (v) { return v.dorm; })));
    var dorms = [[0, 'Cualquiera']].concat([1, 2, 3, 4].filter(function (n) { return n <= maxDorm; }).map(function (n) { return [n, n + '+']; }));
    return {
      count: vs.length,
      list: vs.map(li).join(''),
      cats: btn('tipo', 'todos', 'Todo', true, ICON.todo) + groups.map(function (g) { return btn('tipo', g.key, g.label, false, ICON[g.icon]); }).join(''),
      chipsTipo: chip('tipo', 'todos', 'Todos', true) + groups.map(function (g) { return chip('tipo', g.key, g.long, false); }).join(''),
      dorm: dorms.map(function (d) { return chip('dorm', d[0], d[1], d[0] === 0); }).join(''),
      dormHidden: maxDorm < 1,
      zones: chip('pl', 'todos', 'Todas', true) + zones.map(function (z) { return chip('pl', z.slug, z.name, false); }).join(''),
      zonesHidden: zones.length < 2,
      presets: {
        alquiler: presets(avail.map(function (v) { return v.pr; })),
        venta: presets(avail.map(function (v) { return v.pv; }))
      },
      currency: {
        alquiler: (avail.filter(function (v) { return v.pr; })[0] || {}).rentCur || 'ARS',
        venta: 'USD'
      },
      sig: signature(vs)
    };
  }

  /* huella corta para saber si lo que trae la API cambió respecto de lo ya pintado */
  function signature(vs) {
    var s = JSON.stringify(vs.map(function (v) { return [v.id, v.href, v.title, v.loc, v.det, v.img, v.tag[1], v.pr, v.pv, v.dorm, v.lat, v.lng, v.tipo.key]; })), h = 5381;
    for (var i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36) + '.' + vs.length;
  }

  root.CatalogCore = {render: render, views: views};
  if (typeof module !== 'undefined' && module.exports) module.exports = root.CatalogCore;
})(typeof window !== 'undefined' ? window : globalThis);
