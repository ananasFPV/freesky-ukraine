(function () {
  'use strict';

  // Адреса веб-застосунку Google Apps Script (див. apps-script/README.md).
  // Поки порожня, форма відкриває WhatsApp менеджера.
  var FORM_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzm0ttPBx_XmIThJE0RXWSoZHo1PlUi3-tTCZ6CwJgCKGoufMEyHUoWSu8OceVlD0kNww/exec';

  var views = document.querySelectorAll('.view');
  var menu = document.getElementById('menu');
  var menuBtn = document.querySelector('.menu-btn');
  var wipe = document.querySelector('.wipe');
  var stickyCta = document.querySelector('.sticky-cta');
  // нижня кнопка ховається, коли на екрані вже є своя кнопка запису
  var onTrial = false, ctaInView = 0;
  function syncSticky() { stickyCta.classList.toggle('hide', onTrial || ctaInView > 0); }
  if ('IntersectionObserver' in window) {
    var ctaWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        var was = en.target._seen || false;
        if (en.isIntersecting !== was) { ctaInView += en.isIntersecting ? 1 : -1; en.target._seen = en.isIntersecting; }
      });
      syncSticky();
    });
    document.querySelectorAll('main .btn--go, .footer').forEach(function (el) { ctaWatch.observe(el); });
  }
  var form = document.getElementById('signup');
  var calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var current = null;
  var busy = false;

  // --- мова ---

  var dict = window.FS_I18N;
  var lang = 'uk';
  var nodes = document.querySelectorAll('[data-i18n]');
  var ukHtml = [];
  nodes.forEach(function (el, i) { ukHtml[i] = el.innerHTML; });

  function ui(key) { return dict.ui[lang][key]; }

  function setLang(next) {
    lang = next === 'en' ? 'en' : 'uk';
    nodes.forEach(function (el, i) {
      var tr = lang === 'en' ? dict.en[el.dataset.i18n] : null;
      el.innerHTML = tr || ukHtml[i];
    });
    document.documentElement.lang = lang === 'en' ? 'en' : 'uk';
    document.title = ui('title');
    document.querySelector('meta[name="description"]').content = ui('desc');
    document.querySelectorAll('.lang button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.lang === lang));
    });
    menuBtn.querySelector('.menu-btn__label').textContent =
      menu.classList.contains('is-open') ? ui('menuClose') : ui('menuOpen');
    form.querySelector('.signup__msg').textContent = '';
    try { localStorage.setItem('fs-lang', lang); } catch (e) {}
  }

  document.querySelector('.lang').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b && b.dataset.lang !== lang) setLang(b.dataset.lang);
  });

  function viewFromHash() {
    var name = location.hash.replace(/^#\/?/, '') || 'home';
    return document.querySelector('.view[data-view="' + name + '"]') ? name : 'home';
  }

  function show(name) {
    views.forEach(function (v) {
      var on = v.dataset.view === name;
      v.hidden = !on;
      v.classList.toggle('is-in', on);
    });
    menu.querySelectorAll('a').forEach(function (a) {
      var target = a.getAttribute('href').replace(/^#\/?/, '') || 'home';
      if (target === name) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
    onTrial = name === 'trial';
    syncSticky();
    window.scrollTo(0, 0);
    current = name;
    watchReveal();
    if (name === 'races') runTimer();
  }

  function go(name) {
    if (name === current || busy) return;
    if (calm || current === null) { show(name); return; }

    busy = true;
    wipe.classList.remove('run');
    void wipe.offsetWidth; // перезапуск анімації
    wipe.classList.add('run');

    // підміняємо вкладку, поки екран закритий смугами
    setTimeout(function () { show(name); }, 380);
    setTimeout(function () { wipe.classList.remove('run'); busy = false; }, 1000);
  }

  window.addEventListener('hashchange', function () {
    closeMenu();
    go(viewFromHash());
  });

  // --- меню ---

  function openMenu() {
    menu.hidden = false;
    requestAnimationFrame(function () { menu.classList.add('is-open'); });
    menuBtn.setAttribute('aria-expanded', 'true');
    menuBtn.querySelector('.menu-btn__label').textContent = ui('menuClose');
    document.body.classList.add('no-scroll');
  }

  function closeMenu() {
    if (!menu.classList.contains('is-open')) return;
    menu.classList.remove('is-open');
    menuBtn.setAttribute('aria-expanded', 'false');
    menuBtn.querySelector('.menu-btn__label').textContent = ui('menuOpen');
    document.body.classList.remove('no-scroll');
    setTimeout(function () {
      if (!menu.classList.contains('is-open')) menu.hidden = true;
    }, 600);
  }

  menuBtn.addEventListener('click', function () {
    menu.classList.contains('is-open') ? closeMenu() : openMenu();
  });

  // клік по поточному пункту теж має закривати меню
  menu.addEventListener('click', function (e) {
    if (e.target.closest('a')) closeMenu();
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeMenu();
  });

  // --- поява блоків ---

  var io = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (en.isIntersecting) {
        en.target.classList.add('on');
        io.unobserve(en.target);
      }
    });
  }, { rootMargin: '0px 0px -8% 0px' }) : null;

  function watchReveal() {
    var items = document.querySelectorAll('.view:not([hidden]) .rv:not(.on)');
    items.forEach(function (el, i) {
      if (!io) { el.classList.add('on'); return; }
      el.style.transitionDelay = Math.min(i, 4) * 60 + 'ms';
      io.observe(el);
    });
  }

  // --- табло часу на сторінці змагань ---

  var timerEl = document.querySelector('.timer__time');

  function runTimer() {
    var end = parseFloat(timerEl.dataset.time);
    if (calm) { timerEl.textContent = end.toFixed(2); return; }
    var t0 = null;
    function tick(t) {
      if (t0 === null) t0 = t;
      var k = Math.min((t - t0) / 1600, 1);
      k = 1 - Math.pow(1 - k, 3);
      timerEl.textContent = (end * k).toFixed(2).padStart(5, '0');
      if (k < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // --- форма запису ---
  // Заявка йде в Google-таблицю й Telegram через Apps Script.
  // Якщо скрипт не налаштований або не відповідає, пропонуємо WhatsApp.

  var msgEl = form.querySelector('.signup__msg');
  var sendBtn = form.querySelector('button[type="submit"]');

  function waLink() {
    var m = ui('msg');
    var text = m[0] + '\n' +
      m[1] + ': ' + form.elements.parent.value.trim() + '\n' +
      m[2] + ': ' + form.elements.phone.value.trim() + '\n' +
      m[3] + ': ' + form.elements.age.value + '\n' +
      m[4] + ': ' + ui('city')[form.elements.city.value] + '\n' +
      m[5] + ': ' + ui('yesno')[form.elements.mil.value];
    return 'https://wa.me/380957592188?text=' + encodeURIComponent(text);
  }

  function say(text, cls) {
    msgEl.textContent = text;
    msgEl.className = 'signup__msg' + (cls ? ' ' + cls : '');
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var ok = true;
    ['parent', 'phone', 'age'].forEach(function (n) {
      var f = form.elements[n];
      var bad = !f.value.trim() || !f.checkValidity() || (n === 'phone' && f.value.replace(/\D/g, '').length < 9);
      f.classList.toggle('bad', bad);
      if (bad && ok) { f.focus(); ok = false; }
    });
    if (!ok) return;

    if (!FORM_ENDPOINT) {
      window.open(waLink(), '_blank', 'noopener');
      say(ui('formThanks'));
      return;
    }

    // у таблицю й Telegram завжди пишемо українською, щоб менеджеру було однаково
    var uk = dict.ui.uk;
    var body = new URLSearchParams({
      parent: form.elements.parent.value.trim(),
      phone: form.elements.phone.value.trim(),
      age: form.elements.age.value,
      city: uk.city[form.elements.city.value],
      mil: uk.yesno[form.elements.mil.value],
      lang: lang,
      website: form.elements.website.value
    });

    sendBtn.disabled = true;
    say(ui('formSending'));

    fetch(FORM_ENDPOINT, { method: 'POST', body: body })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.error || 'fail');
        say(ui('formSent'), 'is-ok');
        form.reset();
      })
      .catch(function () {
        msgEl.className = 'signup__msg is-err';
        msgEl.innerHTML = ui('formFail') + ' <a href="' + waLink() + '" target="_blank" rel="noopener">WhatsApp</a>';
      })
      .then(function () { sendBtn.disabled = false; });
  });

  form.addEventListener('input', function (e) { e.target.classList.remove('bad'); });

  // відео без звуку: грають лише коли їх видно на екрані
  var clips = [].slice.call(document.querySelectorAll('.frame__slot video'));
  clips.forEach(function (v) { v.removeAttribute('autoplay'); v.muted = true; });
  if (!calm && 'IntersectionObserver' in window) {
    var clipWatch = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { var p = en.target.play(); if (p && p.catch) p.catch(function () {}); }
        else en.target.pause();
      });
    }, { threshold: 0.25 });
    clips.forEach(function (v) { clipWatch.observe(v); });
  }

  document.getElementById('year').textContent = new Date().getFullYear();

  var saved = null;
  try { saved = localStorage.getItem('fs-lang'); } catch (e) {}
  if (saved === 'en') setLang('en');

  show(viewFromHash());
})();
