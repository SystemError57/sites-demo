// Интерактив шаблона: шапка, вкладки, галерея, до/после, калькулятор, нижняя панель.
(() => {
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
  const fmt = (n) => Math.round(n).toLocaleString('ru-RU');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // шапка и нижняя панель реагируют на прокрутку
  const topbar = document.querySelector('[data-topbar]');
  const dock = document.querySelector('.dock');
  const onScroll = () => {
    const y = scrollY;
    topbar?.classList.toggle('is-scrolled', y > 40);
    dock?.classList.toggle('is-on', y > innerHeight * 0.6);
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // вкладки прайса (стрелки на клавиатуре тоже работают)
  $$('[data-tabs]').forEach((box) => {
    const tabs = $$('[role="tab"]', box);
    const select = (t) => {
      tabs.forEach((x) => {
        const on = x === t;
        x.setAttribute('aria-selected', on);
        x.tabIndex = on ? 0 : -1;
        document.getElementById(x.getAttribute('aria-controls')).hidden = !on;
      });
    };
    tabs.forEach((t, i) => {
      t.tabIndex = i ? -1 : 0;
      t.addEventListener('click', () => select(t));
      t.addEventListener('keydown', (e) => {
        const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        const n = tabs[(i + d + tabs.length) % tabs.length];
        select(n); n.focus();
      });
    });
  });

  // галерея: кнопки + перетаскивание мышью (на телефоне — обычный свайп)
  $$('[data-gallery]').forEach((g) => {
    const track = g.querySelector('.gallery__track');
    const [prev, next] = $$('[data-dir]', g);
    const step = () => track.querySelector('.gallery__item')?.getBoundingClientRect().width + 16 || 300;
    const sync = () => {
      prev.disabled = track.scrollLeft < 4;
      next.disabled = track.scrollLeft + track.clientWidth > track.scrollWidth - 4;
    };
    [prev, next].forEach((b) => b.addEventListener('click', () => track.scrollBy({ left: step() * +b.dataset.dir, behavior: reduced ? 'auto' : 'smooth' })));
    track.addEventListener('scroll', sync, { passive: true });
    sync();
    let x0 = 0, s0 = 0, moved = false;
    track.addEventListener('pointerdown', (e) => {
      if (e.pointerType !== 'mouse') return;
      x0 = e.clientX; s0 = track.scrollLeft; moved = false;
      track.setPointerCapture(e.pointerId);
      track.classList.add('is-drag');
    });
    track.addEventListener('pointermove', (e) => {
      if (!track.classList.contains('is-drag')) return;
      const dx = e.clientX - x0;
      if (Math.abs(dx) > 3) moved = true;
      track.scrollLeft = s0 - dx;
    });
    const end = () => {
      if (!track.classList.contains('is-drag')) return;
      track.classList.remove('is-drag');
      // докрутить до ближайшей карточки
      const w = step();
      track.scrollTo({ left: Math.round(track.scrollLeft / w) * w, behavior: reduced ? 'auto' : 'smooth' });
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('click', (e) => { if (moved) e.preventDefault(); }, true);
  });

  // до/после
  $$('.ba').forEach((ba) => {
    const r = ba.querySelector('.ba__range');
    const set = () => ba.style.setProperty('--pos', r.value + '%');
    r.addEventListener('input', set);
    set();
  });

  // калькулятор
  $$('[data-calc]').forEach((box) => {
    const cfg = JSON.parse(box.dataset.calc);
    const sumEl = box.querySelector('[data-sum]');
    const sumWrap = sumEl.parentElement;
    const send = box.querySelector('[data-calc-send]');
    const state = {};
    cfg.fields.forEach((f) => { state[f.id] = f.type === 'checks' ? [] : f.type === 'stepper' ? f.default : (f.default || 0); });

    let shown = 0, raf = 0;
    const animateTo = (target) => {
      cancelAnimationFrame(raf);
      if (reduced) { sumEl.textContent = fmt(target); shown = target; return; }
      const from = shown, t0 = performance.now();
      const tick = (t) => {
        const k = Math.min(1, (t - t0) / 420);
        shown = from + (target - from) * (1 - Math.pow(1 - k, 3));
        sumEl.textContent = fmt(shown);
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
      sumWrap.classList.remove('is-bump'); void sumWrap.offsetWidth; sumWrap.classList.add('is-bump');
    };

    const calc = () => {
      let add = cfg.base, mult = 1, extra = 0;
      const lines = [];
      cfg.fields.forEach((f) => {
        const v = state[f.id];
        if (f.type === 'select') {
          const o = f.options[v];
          add += o.add || 0; mult *= o.mult || 1;
          lines.push(`${f.label}: ${o.label}`);
        } else if (f.type === 'stepper') {
          add += (f.per || 0) * v; mult *= Math.pow(f.multPer || 1, v);
          lines.push(`${f.label}: ${v}${f.unit ? ' ' + f.unit : ''}`);
        } else if (f.type === 'checks') {
          v.forEach((i) => { const o = f.options[i]; if (o.extra) extra += o.extra; else add += o.add || 0; });
          if (v.length) lines.push(`${f.label}: ${v.map((i) => f.options[i].label).join(', ')}`);
        }
      });
      const total = Math.round((add * mult + extra) / 100) * 100;
      animateTo(total);
      const text = `${cfg.intro}\n${lines.join('\n')}\nИтого примерно: ${fmt(total)} ₽`;
      send.href = `https://wa.me/${cfg.wa}?text=${encodeURIComponent(text)}`;
    };

    box.addEventListener('change', (e) => {
      const fieldEl = e.target.closest('[data-field]');
      if (!fieldEl) return;
      const id = fieldEl.dataset.field;
      if (fieldEl.dataset.kind === 'select') state[id] = +e.target.value;
      if (fieldEl.dataset.kind === 'checks') state[id] = $$('input:checked', fieldEl).map((i) => +i.value);
      calc();
    });
    $$('[data-kind="stepper"]', box).forEach((el) => {
      const f = cfg.fields.find((x) => x.id === el.dataset.field);
      const out = el.querySelector('output');
      const [minus, plus] = $$('[data-step]', el);
      const sync = () => { out.textContent = state[f.id]; minus.disabled = state[f.id] <= f.min; plus.disabled = state[f.id] >= f.max; };
      [minus, plus].forEach((b) => b.addEventListener('click', () => {
        state[f.id] = Math.min(f.max, Math.max(f.min, state[f.id] + (+b.dataset.step) * (f.step || 1)));
        sync(); calc();
      }));
      sync();
    });
    calc();
  });
})();
