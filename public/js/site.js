/* Devikka storefront — theme, curtain, dress-pack builder, checkout, visit plans. No frameworks. */
(function () {
  var D = window.DVK || {};
  var csrf = D.csrf;
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function post(url, data) {
    return fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf, 'Accept': 'application/json' }, body: JSON.stringify(data), credentials: 'same-origin' })
      .then(function (r) { return r.json().then(function (j) { if (!r.ok) { var e = new Error(j.error || 'Request failed'); e.data = j; throw e; } return j; }); });
  }
  function money(n) { return '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 }); }

  /* ---- theme ---- */
  var tb = $('#themeToggle');
  if (tb) {
    var root = document.documentElement;
    var label = function () { var light = root.getAttribute('data-theme') === 'light'; tb.setAttribute('aria-pressed', light ? 'true' : 'false'); var l = tb.querySelector('.tlabel'); if (l) l.textContent = light ? (D.locale === 'hi' ? 'गहरा' : 'Dark') : (D.locale === 'hi' ? 'रोशन' : 'Light'); };
    label();
    tb.addEventListener('click', function () { var light = root.getAttribute('data-theme') === 'light'; if (light) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'light'); try { localStorage.setItem('devika-theme', light ? 'dark' : 'light'); } catch (e) {} label(); });
  }

  /* ---- darshan curtain: once per session ---- */
  var parda = $('.parda');
  if (parda) {
    try { if (sessionStorage.getItem('devikka-darshan')) parda.remove(); else sessionStorage.setItem('devikka-darshan', '1'); } catch (e) {}
    setTimeout(function () { if (parda.parentNode) parda.remove(); }, 2400);
  }

  /* ---- slot groups (aria-pressed toggles) ---- */
  $$('.slots').forEach(function (g) {
    g.addEventListener('click', function (e) { var b = e.target.closest('.slot'); if (!b) return; $$('.slot', g).forEach(function (s) { s.setAttribute('aria-pressed', 'false'); }); b.setAttribute('aria-pressed', 'true'); g.dispatchEvent(new CustomEvent('slotchange', { bubbles: true })); });
  });

  /* ---- Razorpay helper ---- */
  function openRazorpay(opts, onSuccess, onFail) {
    if (!window.Razorpay) { onFail(new Error('Payment library did not load. Check your connection and try again.')); return; }
    var rz = new window.Razorpay(Object.assign({ key: D.rzp, name: D.brand, theme: { color: '#CFA655' }, modal: { ondismiss: function () { onFail(new Error('dismissed')); } } }, opts));
    rz.on('payment.failed', function (r) { onFail(new Error(r.error && r.error.description || 'Payment failed')); });
    rz.open();
  }

  /* ---- dress pack builder ---- */
  var pack = $('#packForm');
  if (pack) {
    var count = $('#packCount'), priceBox = $('#packPrice'), confirmBox = $('#packConfirm'), thaliN = $('#thaliN'), lamps = $$('#thali .d');
    var rhythmG = $('.rhythm', pack);
    var T = D.locale === 'hi' ? { one: 'विग्रह चुना गया', many: 'विग्रह चुने गए', sub: 'प्रति बार', off: 'कॉम्बो छूट', none: 'कम से कम एक विग्रह चुनिए।', s5: '30″ से ऊपर की क़ीमत अलग से।', login: 'सदस्यता के लिए पहले लॉगिन कीजिए।', wait: 'कृपया प्रतीक्षा करें…' }
                              : { one: 'deity selected', many: 'deities selected', sub: 'per cycle', off: 'combo discount', none: 'Pick at least one deity.', s5: 'Above 30″ is quoted individually.', login: 'Please log in to subscribe.', wait: 'Please wait…' };
    function rhythm() { var b = rhythmG && $('.slot[aria-pressed="true"]', rhythmG); return b ? b.getAttribute('data-rhythm') : 'monthly'; }
    function chosen() {
      return $$('.cfgrow', pack).filter(function (r) { return $('input[name=deity]', r).checked; }).map(function (r) {
        return { deity_id: Number($('input[name=deity]', r).value), band_code: $('select[name=band]', r).value };
      });
    }
    var timer;
    function refresh() {
      var picks = chosen(), n = picks.length;
      if (thaliN) thaliN.textContent = n;
      lamps.forEach(function (l, i) { l.classList.toggle('off', i >= n); });
      count.innerHTML = n + ' ' + (n === 1 ? T.one : T.many) + '<span class="sub">' + T.wait + '</span>';
      clearTimeout(timer);
      timer = setTimeout(function () {
        var priceable = picks.filter(function (p) { return /^S[1-4]$/.test(p.band_code); });
        if (!priceable.length) { count.innerHTML = n + ' ' + (n === 1 ? T.one : T.many) + '<span class="sub">' + (picks.some(function (p) { return p.band_code === 'S5'; }) ? T.s5 : '') + '</span>'; priceBox.hidden = true; return; }
        post(pack.getAttribute('data-price-url'), { items: priceable, rhythm: rhythm() }).then(function (pr) {
          count.innerHTML = n + ' ' + (n === 1 ? T.one : T.many) + '<span class="sub">' + money(pr.perCycle) + ' ' + T.sub + (pr.pct ? ' · ' + pr.pct + '% ' + T.off : '') + '</span>';
          priceBox.hidden = false;
          priceBox.innerHTML = pr.lines.filter(function (l) { return l.unit; }).map(function (l) { return '<div class="tot"><span>' + $('.cfgrow input[value="' + l.deity_id + '"]', pack).parentNode.textContent.trim() + ' · ' + l.band_code + '</span><span>' + money(l.unit) + '</span></div>'; }).join('')
            + (pr.discount ? '<div class="tot"><span>' + T.off + ' (' + pr.pct + '%)</span><span>− ' + money(pr.discount) + '</span></div>' : '')
            + '<div class="tot big"><span>' + T.sub + '</span><span>' + money(pr.perCycle) + '</span></div>';
        }).catch(function () { priceBox.hidden = true; });
      }, 250);
    }
    pack.addEventListener('change', refresh);
    pack.addEventListener('slotchange', refresh);
    refresh();
    pack.addEventListener('submit', function (e) {
      e.preventDefault();
      var picks = chosen().filter(function (p) { return /^S[1-4]$/.test(p.band_code); });
      confirmBox.hidden = false; confirmBox.className = 'confirm';
      if (!picks.length) { confirmBox.className = 'confirm err'; confirmBox.textContent = T.none; return; }
      confirmBox.textContent = T.wait;
      post(D.L + '/subscribe/dress-pack', { items: picks, rhythm: rhythm() }).then(function (j) {
        openRazorpay({ subscription_id: j.subscription_id, description: 'Devikka dress combo pack', prefill: { name: j.name || '', contact: j.phone || '' },
          handler: function (resp) {
            post(D.L + '/subscribe/verify', resp).then(function (v) { window.location = v.redirect; }).catch(function (err) { confirmBox.className = 'confirm err'; confirmBox.textContent = err.message; });
          } }, null, function (err) { if (err.message !== 'dismissed') { confirmBox.className = 'confirm err'; confirmBox.textContent = err.message; } else confirmBox.hidden = true; });
      }).catch(function (err) {
        if (err.data && err.data.redirect) { window.location = err.data.redirect; return; }
        confirmBox.className = 'confirm err'; confirmBox.textContent = err.message;
      });
    });
    // deep link ?deity=slug pre-ticks
    var m = location.search.match(/deity=([a-z-]+)/);
    if (m) { /* slugs are not in the DOM; tick by label match is unreliable, so leave default */ }
  }

  /* ---- visit plan subscribe ---- */
  var vf = $('#visitForm');
  if (vf) {
    var box = $('#visitBox'), title = $('#visitTitle'), pin = $('#visitPin'), go = $('#visitGo'), msg = $('#visitMsg'), sel = null;
    $$('.visit-sub', vf).forEach(function (b) {
      b.addEventListener('click', function () { sel = { footprint: b.getAttribute('data-fp'), rhythm: b.getAttribute('data-rhythm') }; title.textContent = b.closest('.plan').querySelector('.nm').textContent + ' · ' + b.textContent; box.hidden = false; box.scrollIntoView({ behavior: 'smooth', block: 'center' }); pin.focus(); });
    });
    go.addEventListener('click', function () {
      if (!sel) return; msg.hidden = true;
      post(D.L + '/subscribe/visit', { footprint: sel.footprint, rhythm: sel.rhythm, pincode: pin.value.trim() }).then(function (j) {
        openRazorpay({ subscription_id: j.subscription_id, description: 'Devikka Mandir Seva visit plan', prefill: { name: j.name || '', contact: j.phone || '' },
          handler: function (resp) { post(D.L + '/subscribe/verify', resp).then(function (v) { window.location = v.redirect; }).catch(function (err) { msg.hidden = false; msg.className = 'notice err'; msg.textContent = err.message; }); } },
          null, function (err) { if (err.message !== 'dismissed') { msg.hidden = false; msg.className = 'notice err'; msg.textContent = err.message; } });
      }).catch(function (err) { if (err.data && err.data.redirect) { window.location = err.data.redirect; return; } msg.hidden = false; msg.className = 'notice err'; msg.textContent = err.message; });
    });
  }

  /* ---- checkout ---- */
  var co = $('#checkoutForm');
  if (co) {
    var coMsg = $('#coMsg');
    co.addEventListener('submit', function (e) {
      e.preventDefault(); coMsg.hidden = true;
      var data = {}; new FormData(co).forEach(function (v, k) { data[k] = v; });
      var btn = $('button[type=submit]', co); btn.disabled = true;
      post(co.getAttribute('data-url'), data).then(function (j) {
        openRazorpay({ order_id: j.rz_order_id, amount: j.amount, currency: j.currency, description: 'Order ' + j.order_no, prefill: { name: j.name, contact: j.phone },
          handler: function (resp) {
            post(co.getAttribute('data-verify'), { order_id: j.order_id, razorpay_order_id: resp.razorpay_order_id, razorpay_payment_id: resp.razorpay_payment_id, razorpay_signature: resp.razorpay_signature })
              .then(function (v) { window.location = v.redirect; }).catch(function (err) { btn.disabled = false; coMsg.hidden = false; coMsg.textContent = err.message; });
          } }, null, function (err) { btn.disabled = false; if (err.message !== 'dismissed') { coMsg.hidden = false; coMsg.textContent = err.message; } });
      }).catch(function (err) { btn.disabled = false; coMsg.hidden = false; coMsg.textContent = err.message; });
    });
  }
})();
