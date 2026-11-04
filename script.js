/* GLOSS — поведение страницы */
document.documentElement.classList.add('js');

/* ---------- появление: каскад, один раз ---------- */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // первый экран — по лестнице: лого 300 / меню 420 / заголовок 900 / подзаголовок 1040 / кнопки 1200
  const ladder = [
    ['.nav__logo', 300], ['.nav__links', 420], ['.nav__right', 480],
    ['.hero__title', 900], ['.hero__lead', 1040], ['.hero__cta', 1200], ['.hero__note', 1260], ['.hero__stats', 1360]
  ];
  ladder.forEach(([sel, d]) => {
    const el = document.querySelector(sel);
    if (!el) return;
    el.style.setProperty('--d', (reduce ? 0 : d) + 'ms');
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('is-in')));
  });

  const rest = [...document.querySelectorAll('.rise')].filter(el => !el.closest('.nav, .hero'));
  // однородные элементы в одном контейнере — шаг 50 мс
  const groups = new Map();
  rest.forEach(el => {
    const p = el.parentElement;
    const i = groups.get(p) || 0;
    groups.set(p, i + 1);
    el.style.setProperty('--d', (reduce ? 0 : Math.min(i * 50, 400)) + 'ms');
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
  rest.forEach(el => io.observe(el));
})();

/* ---------- навбар при скролле ---------- */
(() => {
  const nav = document.querySelector('.nav');
  const on = () => nav.classList.toggle('is-scrolled', scrollY > 40);
  addEventListener('scroll', on, { passive: true });
  on();
})();

/* ---------- калькулятор ---------- */
const PRICES = {
  polish:   { name: 'Полировка кузова',      price: 12000, days: 2,   scale: true },
  ceramic:  { name: 'Керамика',              price: 25000, days: 2,   scale: true },
  ppf:      { name: 'Плёнка на зоны риска',  price: 45000, days: 3,   scale: true },
  interior: { name: 'Химчистка салона',      price: 7000,  days: 1,   scale: true },
  lights:   { name: 'Фары',                  price: 2500,  days: 0,   scale: false },
  wash:     { name: 'Детейлинг-мойка',       price: 2000,  days: 0,   scale: true }
};
const fmt = n => Math.round(n).toLocaleString('ru-RU').replace(/\s/g, ' ');
const dayWord = n => (n % 10 === 1 && n % 100 !== 11) ? 'день'
  : ([2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100)) ? 'дня' : 'дней';

let calcSummary = '';
(() => {
  const form = document.getElementById('calcForm');
  const lines = document.getElementById('calcLines');
  const sumEl = document.getElementById('calcSum');
  const daysEl = document.getElementById('calcDays');
  const clsLabel = () => form.querySelector('input[name="cls"]:checked + span').textContent;

  function render() {
    const k = parseFloat(form.querySelector('input[name="cls"]:checked').value);
    const picked = [...form.querySelectorAll('input[name="svc"]:checked')].map(i => PRICES[i.value]);
    lines.innerHTML = '';
    let sum = 0;
    picked.forEach(s => {
      const p = Math.round((s.scale ? s.price * k : s.price) / 100) * 100;
      sum += p;
      const li = document.createElement('li');
      li.innerHTML = `<span>${s.name}</span><span>${fmt(p)} ₽</span>`;
      lines.appendChild(li);
    });
    if (!picked.length) {
      lines.innerHTML = '<li class="is-empty"><span>Отметьте хотя бы одну услугу</span></li>';
    }
    // срок: самая долгая работа + половина остальных, минимум 1 день
    const ds = picked.map(s => s.days).sort((a, b) => b - a);
    const days = Math.max(1, Math.ceil((ds[0] || 0) + ds.slice(1).reduce((a, b) => a + b, 0) * 0.5));
    sumEl.textContent = `${fmt(sum)} ₽`;
    daysEl.textContent = `${days} ${dayWord(days)}`;
    calcSummary = picked.length
      ? `Расчёт с сайта: ${clsLabel()}; ${picked.map(s => s.name.toLowerCase()).join(', ')}. Примерно ${fmt(sum)} ₽, ${days} ${dayWord(days)}.`
      : '';
  }
  // «Забрать расчёт» открывает Telegram-бота с этим расчётом: t.me/<бот>?start=calc_<класс>_<коды услуг>
  const BOT = 'https://t.me/gloss_detailing_bot';
  const CLS_CODE = { '1': '1', '1.25': '2', '1.45': '3' };
  const SVC_CODE = { polish: 'p', ceramic: 'c', ppf: 'f', interior: 'i', lights: 'l', wash: 'w' };
  const cta = document.getElementById('calcCta');
  const syncCta = () => {
    const cls = CLS_CODE[form.querySelector('input[name="cls"]:checked').value];
    const svc = [...form.querySelectorAll('input[name="svc"]:checked')].map(i => SVC_CODE[i.value]).join('');
    cta.href = svc ? `${BOT}?start=calc_${cls}_${svc}` : BOT;
  };
  form.addEventListener('change', () => { render(); syncCta(); });
  render();
  syncCta();
})();

/* ---------- до/после ---------- */
(() => {
  const ba = document.getElementById('ba');
  const handle = ba.querySelector('.ba__handle');
  const after = ba.querySelector('.ba__after');
  const before = ba.querySelector('.ba__before img');
  const caption = document.getElementById('baCaption');
  const CARS = {
    gclass: 'Mercedes G 63: двухэтапная полировка и керамика в 2 слоя. 3 дня в боксе',
    camry:  'Toyota Camry: детейлинг-мойка, лёгкая полировка и воск. 1 день',
    kia:    'Kia K5: мойка, очистка порогов и дисков, полировка. 2 дня'
  };
  let pos = 50, raf = 0;

  const set = p => {
    pos = Math.max(0, Math.min(100, p));
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(() => {
      ba.style.setProperty('--pos', pos + '%');
      handle.setAttribute('aria-valuenow', Math.round(pos));
    });
  };
  const fromEvent = e => {
    const r = ba.getBoundingClientRect();
    set((e.clientX - r.left) / r.width * 100);
  };
  ba.addEventListener('pointerdown', e => {
    ba.setPointerCapture(e.pointerId);
    ba.classList.add('is-drag');
    fromEvent(e);
  });
  ba.addEventListener('pointermove', e => { if (ba.classList.contains('is-drag')) fromEvent(e); });
  const stop = () => ba.classList.remove('is-drag');
  ba.addEventListener('pointerup', stop);
  ba.addEventListener('pointercancel', stop);
  handle.addEventListener('keydown', e => {
    if (e.key === 'ArrowLeft') { set(pos - 5); e.preventDefault(); }
    if (e.key === 'ArrowRight') { set(pos + 5); e.preventDefault(); }
  });

  // подсказка: один раз «покачать» шторку, когда блок впервые виден
  const hint = new IntersectionObserver(([en]) => {
    if (!en.isIntersecting) return;
    hint.disconnect();
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t0 = performance.now();
    const tick = t => {
      const k = Math.min(1, (t - t0) / 1600);
      if (ba.classList.contains('is-drag')) return;
      set(50 + Math.sin(k * Math.PI * 2) * 18 * (1 - k));
      if (k < 1) requestAnimationFrame(tick);
    };
    setTimeout(() => requestAnimationFrame(tick), 700);
  }, { threshold: 0.5 });
  hint.observe(ba);

  // переключение машин
  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(b => b.setAttribute('aria-selected', b === btn));
      const car = btn.dataset.car;
      ba.classList.add('is-loading');
      const a = new Image(), b = new Image();
      let n = 0;
      const done = () => {
        if (++n < 2) return;
        after.src = a.src; before.src = b.src;
        caption.textContent = CARS[car];
        set(50);
        ba.classList.remove('is-loading');
      };
      a.onload = b.onload = a.onerror = b.onerror = done;
      a.src = `assets/photo/ba-${car}-after.jpg`;
      b.src = `assets/photo/ba-${car}-before.jpg`;
    });
  });
})();

/* ---------- форма записи ----------
   Заявка уходит в Telegram через Bot API. Для демо токен пустой —
   форма показывает успех без отправки. Для боевого сайта: токен и chat_id
   вписать сюда (или лучше вынести на прокси, чтобы токен не светился). */
const TG_BOT_TOKEN = '';
const TG_CHAT_ID = '';

(() => {
  const form = document.getElementById('bookingForm');
  const status = document.getElementById('formStatus');
  const btn = form.querySelector('button[type="submit"] .btn__label');

  form.addEventListener('submit', async e => {
    e.preventDefault();
    let ok = true;
    form.querySelectorAll('.is-error').forEach(el => el.classList.remove('is-error'));
    const name = form.name.value.trim(), phone = form.phone.value.trim();
    if (!name) { form.name.closest('.field').classList.add('is-error'); ok = false; }
    if (phone.replace(/\D/g, '').length < 9) { form.phone.closest('.field').classList.add('is-error'); ok = false; }
    if (!form.agree.checked) { form.agree.closest('.agree').classList.add('is-error'); ok = false; }
    if (!ok) {
      status.className = 'form__status is-err';
      status.textContent = 'Проверьте имя, телефон и согласие';
      return;
    }
    btn.textContent = 'Отправляем…';
    const text = `Новая заявка GLOSS\nИмя: ${name}\nТелефон: ${phone}\nМашина: ${form.car.value || '—'}\nКомментарий: ${form.comment.value || '—'}`;
    try {
      if (TG_BOT_TOKEN && TG_CHAT_ID) {
        const r = await fetch(`https://api.telegram.org/bot${TG_BOT_TOKEN}/sendMessage`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: TG_CHAT_ID, text })
        });
        if (!r.ok) throw new Error(r.status);
      } else {
        await new Promise(r => setTimeout(r, 700));
      }
      form.reset();
      status.className = 'form__status is-ok';
      status.textContent = 'Заявка принята. Перезвоним в течение 15 минут';
    } catch (err) {
      status.className = 'form__status is-err';
      status.textContent = 'Не получилось отправить. Позвоните нам: +375 29 123-45-67';
    } finally {
      btn.textContent = 'Записаться на осмотр';
    }
  });
})();
