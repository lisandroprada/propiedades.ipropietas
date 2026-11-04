  (function () {
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
    /* zonas, tipos y escalones de precio salen de los datos (CatalogCore.render → window.__cat) */
    var PLACES = [], TIPOS = [], PRICES = {alquiler: [], venta: []}, CUR = {alquiler: 'ARS', venta: 'USD'};
    function vals(g) { return $$('[data-g="' + g + '"]').map(function (b) { return b.getAttribute('data-v'); }); }
    function readMeta() {
      var cat = window.__cat || {};
      PRICES = cat.presets || PRICES; CUR = cat.currency || CUR;
      PLACES = vals('pl').filter(function (v) { return v !== 'todos'; });
      TIPOS = vals('tipo').filter(function (v) { return v !== 'todos'; });
    }
    var DEF = {op: 'todas', tipo: 'todos', dorm: 0, precio: 0, pl: 'todos'};
    var st = {op: 'todas', tipo: 'todos', dorm: 0, precio: 0, pl: 'todos'};
    var subs = [];

    function num(li, a) { var v = li.getAttribute(a); return v == null ? null : parseInt(v, 10); }
    var items = [];
    function collect() {
      items = $$('.list > li').map(function (li) {
        return {li: li, op: li.getAttribute('data-op').split(' '), pl: li.getAttribute('data-pl'), tipo: li.getAttribute('data-tipo'),
          dorm: num(li, 'data-dorm') || 0, pr: num(li, 'data-pr'), pv: num(li, 'data-pv')};
      });
    }

    function match(it, s) {
      if (s.op !== 'todas' && it.op.indexOf(s.op) < 0) return false;
      if (s.pl !== 'todos' && it.pl !== s.pl) return false;
      if (s.tipo !== 'todos' && it.tipo !== s.tipo) return false;
      if (s.dorm && it.dorm < s.dorm) return false;
      if (s.precio && s.op !== 'todas') {
        var p = s.op === 'alquiler' ? it.pr : it.pv;
        if (p == null || p > s.precio) return false;
      }
      return true;
    }
    function count(s) { return items.filter(function (it) { return match(it, s); }).length; }
    function copy(o) { var c = {}; for (var k in o) c[k] = o[k]; return c; }
    function fmt(n) { return n.toLocaleString('es-AR'); }

    /* hash: #alquiler,casa,d2,p800000,rawson,mapa (los links viejos #alquiler / #rawson siguen andando) */
    function readHash() {
      location.hash.replace('#', '').split(',').forEach(function (t) {
        if (t === 'alquiler' || t === 'venta') st.op = t;
        else if (PLACES.indexOf(t) > -1) st.pl = t;
        else if (TIPOS.indexOf(t) > -1) st.tipo = t;
        else if (/^d[1-9]$/.test(t)) st.dorm = +t.slice(1);
        else if (/^p\d+$/.test(t)) st.precio = +t.slice(1);
      });
    }
    function save() {
      var p = [];
      if (st.op !== 'todas') p.push(st.op);
      if (st.tipo !== 'todos') p.push(st.tipo);
      if (st.dorm) p.push('d' + st.dorm);
      if (st.precio) p.push('p' + st.precio);
      if (st.pl !== 'todos') p.push(st.pl);
      if (window.__mapOpen && window.__mapOpen()) p.push('mapa');
      try { history.replaceState(history.state, '', p.length ? '#' + p.join(',') : location.pathname + location.search); } catch (e) {}
    }
    window.__saveHash = save;

    function renderPrices() {
      var box = $('#fs-prices'), hint = $('#fs-pricehint');
      box.textContent = '';
      if (st.op === 'todas') { box.hidden = true; hint.hidden = false; return; }
      box.hidden = false; hint.hidden = true;
      var cur = CUR[st.op] + ' ';
      if (!PRICES[st.op].length) { box.hidden = true; hint.hidden = false; return; }
      [0].concat(PRICES[st.op]).forEach(function (v) {
        var b = document.createElement('button');
        b.type = 'button'; b.setAttribute('data-g', 'precio'); b.setAttribute('data-v', v);
        b.textContent = v ? 'Hasta ' + cur + fmt(v) : 'Cualquiera';
        box.appendChild(b);
      });
    }

    function apply() {
      if (st.op === 'todas') st.precio = 0;
      renderPrices();
      var n = 0;
      items.forEach(function (it) { var ok = match(it, st); it.li.hidden = !ok; if (ok) n++; });
      $$('[data-g]').forEach(function (b) {
        var g = b.getAttribute('data-g'), v = b.getAttribute('data-v');
        if (g === 'dorm' || g === 'precio') v = +v;
        b.setAttribute('aria-pressed', String(st[g] === v));
      });
      $$('.tabs [data-g="op"]').forEach(function (b) {
        var i = $('i', b); if (!i) return;
        var s = copy(st); s.op = b.getAttribute('data-v'); s.precio = 0; i.textContent = count(s);
      });
      var active = (st.dorm ? 1 : 0) + (st.precio ? 1 : 0) + (st.pl !== 'todos' ? 1 : 0);
      var any = active || st.op !== 'todas' || st.tipo !== 'todos';
      $$('.fcount').forEach(function (b) { b.textContent = active; b.hidden = !active; });
      $('#rescount').textContent = n + (n === 1 ? ' propiedad' : ' propiedades');
      $('#clearlink').hidden = !any;
      $('#empty').hidden = n > 0;
      var ap = $('#fs-apply');
      ap.textContent = n ? 'Ver ' + n + (n === 1 ? ' propiedad' : ' propiedades') : 'Sin resultados';
      save();
      subs.forEach(function (fn) { fn(n); });
    }

    function set(g, v) {
      if (g === 'dorm' || g === 'precio') v = +v;
      st[g] = v;
      if (g === 'op') st.precio = 0;
      apply();
    }
    function clear() { for (var k in DEF) st[k] = DEF[k]; apply(); }

    document.addEventListener('click', function (e) {
      var b = e.target.closest('[data-g]');
      if (b) { set(b.getAttribute('data-g'), b.getAttribute('data-v')); return; }
      if (e.target.closest('[data-open-filters]')) { openFilters(); return; }
    });
    ['clearlink', 'emptyclear', 'fs-clear'].forEach(function (id) { $('#' + id).addEventListener('click', clear); });

    /* hoja de filtros */
    var sheet = $('#fsheet');
    function openFilters() { if (!sheet.open) { sheet.showModal(); document.documentElement.classList.add('lock'); } }
    sheet.addEventListener('close', function () { if (!(window.__mapOpen && window.__mapOpen())) document.documentElement.classList.remove('lock'); });
    sheet.addEventListener('click', function (e) {
      if (e.target === sheet || e.target.closest('[data-close]')) sheet.close();
    });

    /* sombra de la barra pegajosa al hacer scroll */
    var stick = $('#stick');
    function onScroll() { stick.classList.toggle('on', stick.getBoundingClientRect().top <= 0 && window.scrollY > 40); }
    window.addEventListener('scroll', onScroll, {passive: true}); onScroll();

    /* los datos cambiaron (los trajo la API): se repintó la lista y los filtros */
    function reload() {
      readMeta(); collect();
      if (st.pl !== 'todos' && PLACES.indexOf(st.pl) < 0) st.pl = 'todos';
      if (st.tipo !== 'todos' && TIPOS.indexOf(st.tipo) < 0) st.tipo = 'todos';
      $('#fs-dorm-sec').hidden = !!(window.__cat && window.__cat.dormHidden);
      $('#fs-zone-sec').hidden = !!(window.__cat && window.__cat.zonesHidden);
      apply();
    }

    window.Catalog = {onChange: function (fn) { subs.push(fn); }, openFilters: openFilters, reload: reload};
    readMeta(); collect(); readHash();
    $('#fs-dorm-sec').hidden = !!(window.__cat && window.__cat.dormHidden);
    $('#fs-zone-sec').hidden = !!(window.__cat && window.__cat.zonesHidden);
    apply();
  })();

