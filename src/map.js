  (function () {
    var ov = document.getElementById('mapview');
    if (!ov || !window.Promise || !window.Catalog) return;

    var $ = function (id) { return document.getElementById(id); };
    var canvas = $('mapcanvas'), sheet = $('mapsheet'), cardsEl = $('mapcards'), countEl = $('mapcount'), locBtn = $('maploc');
    var fab = $('fabmap');
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isOpen = false, ready = null, map, cluster, userDot, markers = [], selected = -1;
    function collect() {
      return Array.prototype.map.call(document.querySelectorAll('.list > li'), function (li) {
        var lat = parseFloat(li.getAttribute('data-lat')), lng = parseFloat(li.getAttribute('data-lng'));
        return {li: li, ll: isNaN(lat) || isNaN(lng) ? null : [lat, lng], kind: li.hasAttribute('data-off') ? 'off' : li.getAttribute('data-op').split(' ').indexOf('alquiler') > -1 ? 'alq' : ''};
      });
    }

    window.__mapOpen = function () { return isOpen; };

    /* Leaflet se baja recién al abrir el mapa */
    function css(href) {
      return new Promise(function (ok, fail) {
        var l = document.createElement('link');
        l.rel = 'stylesheet'; l.href = href; l.onload = ok; l.onerror = fail;
        document.head.appendChild(l);
      });
    }
    function js(src) {
      return new Promise(function (ok, fail) {
        var s = document.createElement('script');
        s.src = src; s.onload = ok; s.onerror = fail;
        document.head.appendChild(s);
      });
    }
    function loadLeaflet() {
      if (!ready) ready = Promise.all([css('vendor/leaflet.css'), css('vendor/MarkerCluster.css')])
        .then(function () { return js('vendor/leaflet.js'); })
        .then(function () { return js('vendor/leaflet.markercluster.js'); });
      return ready;
    }

    function icon(kind, sel) {
      return L.divIcon({className: '', html: '<span class="pin' + (kind ? ' pin--' + kind : '') + (sel ? ' sel' : '') + '"></span>', iconSize: [24, 24], iconAnchor: [12, 12]});
    }
    function init() {
      if (map) return;
      map = L.map(canvas, {zoomControl: false, attributionControl: false, zoomAnimation: !reduce, markerZoomAnimation: !reduce, center: [-43.30, -65.07], zoom: 12});
      L.control.attribution({position: 'topleft', prefix: false}).addTo(map);
      if (!('ontouchstart' in window) && window.innerWidth >= 700) L.control.zoom({position: 'bottomright', zoomInTitle: 'Acercar', zoomOutTitle: 'Alejar'}).addTo(map);
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
      cluster = L.markerClusterGroup({
        showCoverageOnHover: false, maxClusterRadius: 44, animate: !reduce,
        iconCreateFunction: function (c) { return L.divIcon({className: '', html: '<div class="cl">' + c.getChildCount() + '</div>', iconSize: [40, 40]}); }
      });
      map.addLayer(cluster);
      map.on('click', function () { deselect(); });
    }

    function visible() { return collect().filter(function (it) { return !it.li.hidden; }); }

    function card(it) {
      var li = it.li, a = li.querySelector('a.card-link'), d = document.createElement('div');
      d.className = 'mcard';
      var img = li.querySelector('img').cloneNode();
      img.alt = ''; img.removeAttribute('loading');
      var t = document.createElement('div');
      var bn = li.querySelector('.banner');
      if (bn) { var bd = document.createElement('span'); bd.className = 'mbadge mbadge--' + (bn.className.indexOf('banner--ven') > -1 ? 'ven' : 'alq'); bd.textContent = bn.textContent; t.appendChild(bd); }
      var h = document.createElement('h2'); h.textContent = li.querySelector('h2').textContent;
      var p = document.createElement('p'); var det = li.querySelector('.det'); p.textContent = li.querySelector('.loc').textContent + (det ? '. ' + det.textContent : '');
      var pr = document.createElement('p'); pr.className = 'mprice'; pr.innerHTML = li.querySelector('.price').innerHTML;
      t.appendChild(h); t.appendChild(p); t.appendChild(pr);
      var act = document.createElement('div'); act.className = 'mact';
      var ver = document.createElement('a'); ver.href = a.href; ver.textContent = 'Ver propiedad';
      act.appendChild(ver);
      var calc = li.querySelector('.calc-btn');
      if (calc) {
        var b = document.createElement('button'); b.type = 'button'; b.textContent = 'Calculadora';
        b.addEventListener('click', function () { calc.click(); });
        act.appendChild(b);
      }
      d.appendChild(img); d.appendChild(t); d.appendChild(act);
      return d;
    }

    function refresh(fit) {
      if (!map) return;
      var vis = visible(), withLoc = vis.filter(function (it) { return it.ll; });
      cluster.clearLayers(); markers = []; cardsEl.textContent = ''; selected = -1;
      sheet.classList.remove('on');
      withLoc.forEach(function (it, i) {
        var m = L.marker(it.ll, {icon: icon(it.kind, false), title: it.li.querySelector('h2').textContent, keyboard: true});
        m.on('click', function () { select(i, true); });
        markers.push(m); cluster.addLayer(m); cardsEl.appendChild(card(it));
      });
      var missing = vis.length - withLoc.length;
      countEl.textContent = withLoc.length ? withLoc.length + (withLoc.length === 1 ? ' propiedad' : ' propiedades') + ' en el mapa' + (missing ? ' · ' + missing + ' sin ubicación' : '') : 'No hay propiedades con ubicación para estos filtros';
      if (fit && withLoc.length) map.fitBounds(cluster.getBounds(), {padding: [48, 48], maxZoom: 15, animate: false});
    }

    function focusOn(ll) {
      var z = Math.max(map.getZoom(), 15), p = map.project(ll, z);
      p.y += sheet.offsetHeight / 2;
      map.setView(map.unproject(p, z), z, {animate: !reduce});
    }
    var withLocItems = function () { return visible().filter(function (it) { return it.ll; }); };
    function select(i, scrollCard) {
      if (i < 0 || i >= markers.length) return;
      if (selected > -1 && markers[selected]) markers[selected].setIcon(icon(withLocItems()[selected].kind, false));
      selected = i;
      markers[i].setIcon(icon(withLocItems()[i].kind, true));
      sheet.classList.add('on');
      if (scrollCard) {
        var c = cardsEl.children[i];
        cardsEl.scrollTo({left: c.offsetLeft - cardsEl.offsetLeft - 20, behavior: reduce ? 'auto' : 'smooth'});
      }
      cluster.zoomToShowLayer(markers[i], function () { focusOn(markers[i].getLatLng()); });
    }
    function deselect() {
      if (selected > -1 && markers[selected]) markers[selected].setIcon(icon(withLocItems()[selected].kind, false));
      selected = -1; sheet.classList.remove('on');
    }
    var scrollTimer;
    cardsEl.addEventListener('scroll', function () {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(function () {
        var first = cardsEl.children[0];
        if (!first) return;
        var step = first.offsetWidth + 10, i = Math.round(cardsEl.scrollLeft / step);
        if (i !== selected && sheet.classList.contains('on')) select(i, false);
      }, 120);
    });

    /* abrir / cerrar */
    function open(push) {
      if (isOpen) return;
      isOpen = true;
      ov.hidden = false;
      document.documentElement.classList.add('map-open');
      if (push) { try { history.pushState({map: 1}, '', location.href); } catch (e) {} }
      if (window.__saveHash) window.__saveHash();
      $('mapback').focus();
      countEl.textContent = 'Cargando mapa…';
      loadLeaflet().then(function () { init(); refresh(true); map.invalidateSize(); })
        .catch(function () { countEl.textContent = 'No se pudo cargar el mapa. Probá de nuevo.'; ready = null; });
    }
    function hide() {
      if (!isOpen) return;
      isOpen = false;
      ov.hidden = true;
      document.documentElement.classList.remove('map-open');
      if (window.__saveHash) window.__saveHash();
      fab.focus();
    }
    function close() { if (history.state && history.state.map) history.back(); else hide(); }
    fab.addEventListener('click', function () { open(true); });
    $('mapback').addEventListener('click', close);
    window.addEventListener('popstate', function () { if (isOpen && !(history.state && history.state.map)) hide(); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && isOpen && !$('calc').open && !$('fsheet').open) close(); });

    /* los filtros se reaplican solos sobre el mapa */
    var timer;
    window.Catalog.onChange(function () {
      if (!isOpen) return;
      clearTimeout(timer);
      timer = setTimeout(function () { refresh(true); }, 30);
    });

    /* cerca de mí: pide permiso recién al tocar */
    locBtn.addEventListener('click', function () {
      var label = locBtn.textContent;
      if (!navigator.geolocation || !map) return;
      locBtn.textContent = 'Ubicando…';
      navigator.geolocation.getCurrentPosition(function (pos) {
        var ll = [pos.coords.latitude, pos.coords.longitude];
        if (userDot) userDot.remove();
        userDot = L.circleMarker(ll, {radius: 8, color: '#fff', weight: 3, fillColor: '#2e3192', fillOpacity: 1}).addTo(map);
        map.setView(ll, 14, {animate: !reduce});
        locBtn.textContent = label;
      }, function () {
        locBtn.textContent = 'No se pudo ubicar';
        setTimeout(function () { locBtn.textContent = label; }, 2500);
      }, {enableHighAccuracy: false, timeout: 10000, maximumAge: 60000});
    });

    if (/(^|,)mapa(,|$)/.test(location.hash.slice(1))) open(false);
  })();

