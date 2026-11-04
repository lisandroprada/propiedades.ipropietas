(function () {
    var dlg = document.getElementById('calc');
    if (!dlg || !dlg.showModal) return;
    var ids = {rent: 'c-rent', dep: 'c-dep', fee: 'c-fee', tot: 'c-tot'};
    function money(n, cur) { return cur + ' ' + Math.round(n).toLocaleString('es-AR'); }
    function $(id) { return document.getElementById(id); }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('.calc-btn');
      if (!btn) return;
      var li = btn.closest('li'), rent = parseInt(li.getAttribute('data-pr'), 10);
      var cur = (window.__cat && window.__cat.currency && window.__cat.currency.alquiler) || 'ARS';
      var name = li.querySelector('.loc').textContent;
      var dep = rent, fee = rent * 24 * 0.02;
      $('calc-for').textContent = name + ' · alquiler ' + money(rent, cur);
      $(ids.rent).textContent = money(rent, cur);
      $(ids.dep).textContent = money(dep, cur);
      $(ids.fee).textContent = money(fee, cur);
      $(ids.tot).textContent = money(rent + dep + fee, cur);
      $('calc-wa').href = 'https://wa.me/5492804503151?text=' + encodeURIComponent('Hola! Quiero alquilar "' + name + '" (alquiler ' + money(rent, cur) + '). Vi la calculadora de condiciones y quiero consultar los requisitos.');
      dlg.showModal();
    });
    dlg.addEventListener('click', function (e) { if (e.target === dlg || e.target.hasAttribute('data-close')) dlg.close(); });
  })();
