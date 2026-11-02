(function () {
  'use strict';
  var mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (mq.matches) return;

  var target = 0, cur = 0, lastSet = 0, active = false, lastNow = 0, lastTick = -1;

  function clamp(v) {
    var max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    return Math.max(0, Math.min(max, v));
  }
  function scrollable(el) {
    while (el && el !== document.body && el !== document.documentElement) {
      if (el.scrollHeight > el.clientHeight + 1 && /(auto|scroll)/.test(getComputedStyle(el).overflowY)) return true;
      el = el.parentElement;
    }
    return false;
  }

  window.addEventListener('wheel', function (e) {
    if (mq.matches || e.ctrlKey || e.defaultPrevented) return;
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    if (scrollable(e.target)) return;
    var dy = e.deltaY;
    if (e.deltaMode === 1) dy *= 40;
    else if (e.deltaMode === 2) dy *= window.innerHeight;
    e.preventDefault();
    if (!active) { cur = target = window.pageYOffset; lastNow = 0; }
    target = clamp(target + dy);
    active = true;
    requestAnimationFrame(tick);
  }, { passive: false });

  window.addEventListener('scroll', function () {
    if (active && Math.abs(window.pageYOffset - lastSet) > 2) active = false;
  }, { passive: true });

  function tick(now) {
    if (!active || now === lastTick) return false;
    lastTick = now;
    var dt = lastNow ? Math.min(50, now - lastNow) : 16;
    lastNow = now;
    cur += (target - cur) * (1 - Math.exp(-dt / 85));
    if (Math.abs(target - cur) < 0.4) { cur = target; active = false; }
    lastSet = cur;
    window.scrollTo({ top: cur, behavior: 'instant' });
    if (active) requestAnimationFrame(tick);
    return true;
  }
  window.__smoothTick = tick;
})();
