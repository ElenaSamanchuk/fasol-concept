/* ФаСоль · демо-корзина и оформление заказа навынос.
   Только симуляция: ничего никуда не отправляется. Общий код для zakaz-a/b/c. */
(function () {
  'use strict';
  var KEY = 'fasol-cart-demo', DISC = 0.2, MAXQ = 99;
  var ADDR = 'Гомель, ул. Советская, 36', PHONE = '+375 (44) 790-33-33', PHONE_HREF = '+375447903333';
  var items = (typeof ITEMS !== 'undefined' && ITEMS) || [], byId = {};
  items.forEach(function (x) { byId[x.id] = x; });

  /* ---------- состояние ---------- */
  var cart = [];
  function valid(r) { return r && byId[r.id] && r.q > 0; }
  function read() {
    try {
      var r = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(r)) return r.filter(valid).map(function (x) { return { id: x.id, q: Math.min(MAXQ, x.q | 0) }; });
    } catch (e) {}
    return null;
  }
  function write() { try { localStorage.setItem(KEY, JSON.stringify(cart)); } catch (e) {} }
  cart = read() || [];

  function find(id) { for (var i = 0; i < cart.length; i++) if (cart[i].id === id) return cart[i]; return null; }
  function qty(id) { var r = find(id); return r ? r.q : 0; }
  function count() { return cart.reduce(function (n, r) { return n + r.q; }, 0); }
  function cents(r) { return Math.round(byId[r.id].price * 100) * r.q; }
  function totals() {
    var sum = cart.reduce(function (n, r) { return n + cents(r); }, 0);
    var disc = Math.round(sum * DISC);
    return { sum: sum, disc: disc, pay: sum - disc };
  }
  function money(c) {
    var s = (c / 100).toFixed(2).replace('.', ',');
    return s.replace(/\B(?=(\d{3})+,)/g, ' ') + ' BYN';
  }
  function plural(n, f) {
    var a = n % 100, b = n % 10;
    return f[(a > 10 && a < 20) ? 2 : b === 1 ? 0 : (b > 1 && b < 5) ? 1 : 2];
  }
  function dishes(n) { return n + ' ' + plural(n, ['блюдо', 'блюда', 'блюд']); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }

  function change(id, d) {
    var r = find(id);
    if (!r) { if (d > 0 && byId[id]) cart.push({ id: id, q: 1 }); }
    else { r.q = Math.max(0, Math.min(MAXQ, r.q + d)); if (!r.q) cart = cart.filter(function (x) { return x !== r; }); }
    commit();
  }
  function remove(id) { cart = cart.filter(function (x) { return x.id !== id; }); commit(); }
  function clear() { cart = []; commit(); }
  function commit() {
    write(); refreshBar(); syncCards();
    if (isOpen && step === 1) renderCart();
  }

  /* ---------- шапка, подвал, карточки ---------- */
  var orderLink = document.querySelector('header .order');
  var footer = document.querySelector('.footerbar');
  var goLink = footer && footer.querySelector('.go');
  var products = document.querySelector('.products');

  function refreshBar() {
    var n = count();
    if (orderLink) {
      orderLink.innerHTML = 'Корзина<span class="ord-sum">' + (n ? '· ' + money(totals().sum) : '') + '</span><span class="badge"' + (n ? '' : ' hidden') + '>' + n + '</span>';
      orderLink.setAttribute('aria-label', n ? 'Корзина, ' + dishes(n) : 'Корзина пуста');
      orderLink.setAttribute('aria-haspopup', 'dialog');
    }
    if (goLink) {
      goLink.classList.toggle('is-empty', !n);
      goLink.textContent = n ? 'Перейти к заказу · ' + dishes(n) + ' · ' + money(totals().sum) : 'Корзина пуста';
      goLink.setAttribute('aria-haspopup', 'dialog');
    }
  }

  function stepperHTML(id, name, cls) {
    var q = qty(id);
    return '<button type="button" class="stp-b" data-act="dec" data-id="' + id + '" aria-label="Убавить: ' + esc(name) + '">−</button>' +
      '<span class="stp-n" aria-live="polite">' + q + '</span>' +
      '<button type="button" class="stp-b" data-act="inc" data-id="' + id + '" aria-label="Добавить ещё: ' + esc(name) + '"' + (q >= MAXQ ? ' disabled' : '') + '>+</button>';
  }

  function syncCards() {
    if (!products) return;
    var adds = products.querySelectorAll('.add[data-id]');
    for (var i = 0; i < adds.length; i++) {
      var add = adds[i], id = +add.dataset.id, it = byId[id], q = qty(id), row = add.parentNode;
      var stp = row.querySelector('.stp');
      if (!q) {
        if (stp) stp.remove();
        add.hidden = false; row.classList.remove('has-q');
        continue;
      }
      if (!stp) {
        stp = document.createElement('div'); stp.className = 'stp'; stp.setAttribute('role', 'group');
        row.appendChild(stp);
      }
      stp.setAttribute('aria-label', it.name + ', в корзине ' + q);
      stp.innerHTML = stepperHTML(id, it.name);
      add.hidden = true; row.classList.add('has-q');
    }
  }
  if (products) new MutationObserver(syncCards).observe(products, { childList: true });

  /* ---------- тост ---------- */
  var toast = document.createElement('div');
  toast.className = 'toast'; toast.setAttribute('role', 'status'); toast.setAttribute('aria-live', 'polite');
  document.body.appendChild(toast);
  var toastT;
  function showToast(text) {
    toast.textContent = text;
    toast.style.bottom = ((footer ? footer.offsetHeight : 0) + 12) + 'px';
    toast.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () { toast.classList.remove('show'); }, 1500);
  }

  /* ---------- панель ---------- */
  var ov = document.createElement('div'); ov.className = 'cp-ov';
  var panel = document.createElement('aside'); panel.className = 'cp';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true'); panel.setAttribute('aria-labelledby', 'cp-title');
  document.body.appendChild(ov); document.body.appendChild(panel);

  var isOpen = false, step = 1, lastFocus = null, timers = [], order = null;
  var form = { name: '', phone: '', time: 'asap', at: '', comment: '', pay: 'card' };
  var TIMES = { asap: 'Как можно скорее', m30: 'Через 30 минут', h1: 'Через 1 час', at: 'Ко времени…' };
  var PAYS = { card: 'Картой при получении', cash: 'Наличными при получении' };

  function head(title) {
    return '<div class="cp-head"><h2 class="cp-title" id="cp-title" tabindex="-1">' + title + '</h2>' +
      '<button type="button" class="cp-x" data-act="close" aria-label="Закрыть корзину">×</button></div>';
  }

  function renderCart() {
    var mark = activeMark();
    var t = totals(), h = head('Ваш заказ');
    if (!cart.length) {
      panel.innerHTML = h + '<div class="cp-body"><div class="cp-empty"><p class="cp-empty-t">В корзине пока пусто</p>' +
        '<p>Добавьте блюда из меню, и они появятся здесь</p></div></div>' +
        '<div class="cp-foot"><button type="button" class="cp-btn" data-act="close">Вернуться в меню</button></div>';
      afterRender(mark); return;
    }
    var li = cart.map(function (r) {
      var it = byId[r.id];
      return '<li class="ci"><img class="ci-img" src="' + esc(it.image) + '" alt="" width="64" height="64">' +
        '<div class="ci-main"><div class="ci-top"><span class="ci-name">' + esc(it.name) + '</span>' +
        '<span class="ci-sum">' + money(cents(r)) + '</span></div>' +
        '<div class="ci-unit">' + money(Math.round(it.price * 100)) + '</div>' +
        '<div class="ci-ctl"><div class="stp" role="group" aria-label="' + esc(it.name) + ', количество ' + r.q + '">' + stepperHTML(r.id, it.name) + '</div>' +
        '<button type="button" class="ci-del" data-act="del" data-id="' + r.id + '" aria-label="Удалить из корзины: ' + esc(it.name) + '">Удалить</button></div></div></li>';
    }).join('');
    panel.innerHTML = h + '<div class="cp-body"><ul class="ci-list">' + li + '</ul></div>' +
      '<div class="cp-foot"><dl class="cp-sums">' +
      '<div><dt>Сумма · ' + dishes(count()) + '</dt><dd>' + money(t.sum) + '</dd></div>' +
      '<div class="disc"><dt>Самовывоз — скидка 20 %</dt><dd>−' + money(t.disc) + '</dd></div>' +
      '<div class="pay"><dt>К оплате</dt><dd>' + money(t.pay) + '</dd></div></dl>' +
      '<button type="button" class="cp-btn" data-act="checkout">Оформить заказ</button></div>';
    afterRender(mark);
  }

  function renderForm() {
    var t = totals();
    panel.innerHTML = '<form class="cp-form" novalidate>' + head('Оформление') +
      '<div class="cp-body">' +
      '<p class="cp-lead">Самовывоз: ' + ADDR + '<br>' + dishes(count()) + ' · к оплате ' + money(t.pay) + '</p>' +
      '<div class="fld"><label for="f-name">Ваше имя</label>' +
      '<input id="f-name" name="name" type="text" autocomplete="given-name" maxlength="60" placeholder="Как к вам обращаться" value="' + esc(form.name) + '"><p class="err" id="e-name" role="alert"></p></div>' +
      '<div class="fld"><label for="f-phone">Телефон</label>' +
      '<input id="f-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="+375 (29) 123-45-67" value="' + esc(form.phone) + '"><p class="err" id="e-phone" role="alert"></p></div>' +
      '<div class="fld"><label for="f-time">Время самовывоза</label><select id="f-time" name="time">' +
      Object.keys(TIMES).map(function (k) { return '<option value="' + k + '"' + (form.time === k ? ' selected' : '') + '>' + TIMES[k] + '</option>'; }).join('') +
      '</select></div>' +
      '<div class="fld" id="at-wrap"' + (form.time === 'at' ? '' : ' hidden') + '><label for="f-at">Во сколько заберёте</label>' +
      '<input id="f-at" name="at" type="time" value="' + esc(form.at) + '"><p class="err" id="e-at" role="alert"></p></div>' +
      '<div class="fld"><label for="f-comment">Комментарий к заказу</label>' +
      '<textarea id="f-comment" name="comment" rows="3" maxlength="300" placeholder="Например, без лука">' + esc(form.comment) + '</textarea></div>' +
      '<fieldset class="fld pays"><legend>Способ оплаты</legend>' +
      Object.keys(PAYS).map(function (k) {
        return '<label class="rad"><input type="radio" name="pay" value="' + k + '"' + (form.pay === k ? ' checked' : '') + '><span>' + PAYS[k] + '</span></label>';
      }).join('') + '</fieldset></div>' +
      '<div class="cp-foot"><button type="submit" class="cp-btn">Подтвердить заказ · ' + money(t.pay) + '</button>' +
      '<button type="button" class="cp-btn ghost" data-act="back">Назад к корзине</button></div></form>';
    afterRender();
    var f = panel.querySelector('.cp-form');
    var phone = f.querySelector('#f-phone'), time = f.querySelector('#f-time'), nm = f.querySelector('#f-name'), at = f.querySelector('#f-at'), cm = f.querySelector('#f-comment');
    phone.addEventListener('input', function (e) {
      var prev = phone.dataset.d || '', d = digits(phone.value);
      if (e.inputType && e.inputType.indexOf('delete') === 0 && d === prev) d = d.slice(0, -1);
      phone.value = fmtPhone(d); phone.dataset.d = d; form.phone = phone.value; clearErr('phone');
    });
    phone.dataset.d = digits(phone.value);
    nm.addEventListener('input', function () { form.name = nm.value; clearErr('name'); });
    cm.addEventListener('input', function () { form.comment = cm.value; });
    at.addEventListener('input', function () { form.at = at.value; clearErr('at'); });
    time.addEventListener('change', function () {
      form.time = time.value; panel.querySelector('#at-wrap').hidden = time.value !== 'at';
      if (time.value === 'at') at.focus();
    });
    Array.prototype.forEach.call(f.querySelectorAll('input[name=pay]'), function (r) { r.addEventListener('change', function () { form.pay = r.value; }); });
    f.addEventListener('submit', function (e) { e.preventDefault(); submit(f); });
  }

  function digits(v) {
    var d = String(v).replace(/\D/g, '');
    if (v.charAt(0) === '+') d = d.indexOf('375') === 0 ? d.slice(3) : '';
    else if (d.indexOf('375') === 0) d = d.slice(3);
    else if (d.indexOf('80') === 0) d = d.slice(2);
    return d.slice(0, 9);
  }
  function fmtPhone(d) {
    if (!d) return '';
    var o = '+375 (' + d.slice(0, 2);
    if (d.length > 2) o += ') ' + d.slice(2, 5);
    if (d.length > 5) o += '-' + d.slice(5, 7);
    if (d.length > 7) o += '-' + d.slice(7, 9);
    return o;
  }
  function setErr(k, msg) {
    var e = panel.querySelector('#e-' + k), inp = panel.querySelector('#f-' + k);
    if (!e) return;
    e.textContent = msg; inp.setAttribute('aria-invalid', 'true'); inp.setAttribute('aria-describedby', 'e-' + k);
  }
  function clearErr(k) {
    var e = panel.querySelector('#e-' + k), inp = panel.querySelector('#f-' + k);
    if (!e || !e.textContent) return;
    e.textContent = ''; inp.removeAttribute('aria-invalid'); inp.removeAttribute('aria-describedby');
  }

  function submit(f) {
    var bad = null, nm = f.querySelector('#f-name'), ph = f.querySelector('#f-phone'), tm = f.querySelector('#f-time'), at = f.querySelector('#f-at');
    ['name', 'phone', 'at'].forEach(function (k) { clearErr(k); });
    if (!nm.value.trim()) { setErr('name', 'Укажите имя'); bad = bad || nm; }
    if (digits(ph.value).length < 9) { setErr('phone', 'Введите номер полностью: +375 (XX) XXX-XX-XX'); bad = bad || ph; }
    if (tm.value === 'at' && !at.value) { setErr('at', 'Укажите время'); bad = bad || at; }
    if (bad) { bad.focus(); return; }
    var t = totals();
    order = {
      no: 1000 + Math.floor(Math.random() * 9000), pay: t.pay, n: count(),
      time: form.time === 'at' ? 'Ко времени ' + form.at : TIMES[form.time], payWay: PAYS[form.pay], name: form.name.trim(), st: 0
    };
    step = 3; renderDone();
    timers.push(setInterval(function () {
      if (order.st < 2) { order.st++; updateStatus(); }
      if (order.st >= 2) stopTimers();
    }, 4000));
  }

  var STEPS = ['Принят', 'Готовим', 'Готов к выдаче'];
  function statusHTML() {
    return STEPS.map(function (s, i) {
      var c = i < order.st ? 'done' : i === order.st ? 'now' : '';
      return '<li class="' + c + '"' + (i === order.st ? ' aria-current="step"' : '') + '><span class="dot" aria-hidden="true"></span>' + s + '</li>';
    }).join('');
  }
  function updateStatus() {
    var ol = panel.querySelector('.stat'); if (ol) ol.innerHTML = statusHTML();
    var live = panel.querySelector('.stat-live'); if (live) live.textContent = 'Статус заказа: ' + STEPS[order.st];
  }
  function renderDone() {
    panel.innerHTML = head('Заказ № ' + order.no + ' принят') +
      '<div class="cp-body"><p class="cp-lead">Спасибо' + (order.name ? ', ' + esc(order.name) : '') + '! Мы уже приступаем к приготовлению</p>' +
      '<ol class="stat">' + statusHTML() + '</ol><p class="stat-live sr"></p>' +
      '<dl class="info"><div><dt>Забрать</dt><dd>' + ADDR + '</dd></div>' +
      '<div><dt>Время</dt><dd>' + esc(order.time) + '</dd></div>' +
      '<div><dt>Оплата</dt><dd>' + order.payWay + ' · ' + money(order.pay) + '</dd></div>' +
      '<div><dt>Телефон ресторана</dt><dd><a href="tel:' + PHONE_HREF + '">' + PHONE + '</a></dd></div></dl>' +
      '<p class="demo">Демо-версия: заказ никуда не отправляется</p></div>' +
      '<div class="cp-foot"><button type="button" class="cp-btn" data-act="done">Вернуться в меню</button></div>';
    afterRender();
  }

  function stopTimers() { timers.forEach(clearInterval); timers = []; }

  /* ---------- открытие / закрытие ---------- */
  function activeMark() {
    var a = document.activeElement;
    return a && panel.contains(a) && a.dataset && a.dataset.act ? { act: a.dataset.act, id: a.dataset.id } : null;
  }
  function afterRender(mark) {
    if (mark) {
      var el = panel.querySelector('[data-act="' + mark.act + '"]' + (mark.id ? '[data-id="' + mark.id + '"]' : ''));
      if (el && !el.disabled) { el.focus(); return; }
    }
    if (!mark) { var t = panel.querySelector('.cp-title'); if (t) t.focus({ preventScroll: true }); }
    var body = panel.querySelector('.cp-body'); if (body && !mark) body.scrollTop = 0;
  }
  function go(n) {
    step = n;
    if (n === 1) renderCart(); else if (n === 2) renderForm();
  }
  function open() {
    if (isOpen) return;
    lastFocus = document.activeElement; isOpen = true;
    if (step === 3 && order) renderDone(); else { step = 1; renderCart(); }
    document.documentElement.classList.add('cp-lock');
    ov.classList.add('on'); panel.classList.add('on');
    var t = panel.querySelector('.cp-title'); if (t) t.focus({ preventScroll: true });
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    if (step === 3) { stopTimers(); order = null; form.comment = ''; clear(); }
    step = 1;
    ov.classList.remove('on'); panel.classList.remove('on');
    document.documentElement.classList.remove('cp-lock');
    if (lastFocus && lastFocus.focus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
  }

  /* ---------- события ---------- */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var add = t.closest && t.closest('.add[data-id]');
    if (add) {
      var id = +add.dataset.id; change(id, 1); showToast('Добавлено: ' + byId[id].name);
      var plus = add.parentNode.querySelector('[data-act="inc"]'); if (plus) plus.focus({ preventScroll: true });
      return;
    }
    var link = t.closest && t.closest('header .order, .footerbar .go');
    if (link) { e.preventDefault(); open(); return; }
    var b = t.closest && t.closest('[data-act]');
    if (!b) { if (t === ov) close(); return; }
    var act = b.dataset.act, bid = +b.dataset.id;
    if (act === 'inc') change(bid, 1);
    else if (act === 'dec') {
      var was = qty(bid); change(bid, -1);
      if (was === 1 && !isOpen) { var a2 = products && products.querySelector('.add[data-id="' + bid + '"]'); if (a2) a2.focus({ preventScroll: true }); }
    }
    else if (act === 'del') remove(bid);
    else if (act === 'close') close();
    else if (act === 'checkout') go(2);
    else if (act === 'back') go(1);
    else if (act === 'done') close();
  });
  ov.addEventListener('click', close);
  document.addEventListener('keydown', function (e) {
    if (!isOpen) return;
    if (e.key === 'Escape') { e.preventDefault(); close(); return; }
    if (e.key !== 'Tab') return;
    var f = panel.querySelectorAll('button:not([disabled]),input:not([disabled]),select,textarea,a[href],[tabindex="0"]');
    f = Array.prototype.filter.call(f, function (x) { return x.offsetParent !== null; });
    if (!f.length) return;
    var first = f[0], last = f[f.length - 1];
    if (!panel.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && (document.activeElement === first || document.activeElement.classList.contains('cp-title'))) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    cart = read() || []; refreshBar(); syncCards();
    if (isOpen && step === 1) renderCart();
  });

  refreshBar(); syncCards();
})();
