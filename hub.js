// Витрина: наклейки можно таскать, карточки слегка наклоняются за курсором.
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  document.querySelectorAll('.sticker').forEach((el) => {
    let sx = 0, sy = 0, dx = 0, dy = 0;
    el.addEventListener('pointerdown', (e) => {
      el.setPointerCapture(e.pointerId);
      el.classList.add('is-drag');
      sx = e.clientX - dx; sy = e.clientY - dy;
    });
    el.addEventListener('pointermove', (e) => {
      if (!el.classList.contains('is-drag')) return;
      dx = e.clientX - sx; dy = e.clientY - sy;
      el.style.setProperty('--dx', dx + 'px');
      el.style.setProperty('--dy', dy + 'px');
    });
    const drop = () => el.classList.remove('is-drag');
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);
  });

  if (reduced || !matchMedia('(hover: hover)').matches) return;
  document.querySelectorAll('[data-tilt]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', (px * 6).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-py * 6).toFixed(2) + 'deg');
    });
    el.addEventListener('pointerleave', () => {
      el.style.removeProperty('--rx');
      el.style.removeProperty('--ry');
    });
  });
})();
