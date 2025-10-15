export function getSmoother() {
  try {
    if (typeof window !== 'undefined' && window.ScrollSmoother && window.ScrollSmoother.get) {
      return window.ScrollSmoother.get() || null;
    }
  } catch {}
  return null;
}

export function currentScrollY() {
  try {
    const smoother = getSmoother();
    if (smoother && typeof smoother.scrollTop === 'function') return smoother.scrollTop();
  } catch {}
  try {
    return window.scrollY || window.pageYOffset || 0;
  } catch { return 0; }
}

export function restoreScroll(y) {
  const target = typeof y === 'number' ? y : currentScrollY();
  try {
    const smoother = getSmoother();
    if (smoother && typeof smoother.scrollTo === 'function') {
      smoother.scrollTo(target, true);
      return;
    }
  } catch {}
  try { window.scrollTo({ top: target, left: 0, behavior: 'instant' }); } catch {}
}

export function pauseSmoother(pause = true) {
  try {
    const smoother = getSmoother();
    if (smoother && typeof smoother.paused === 'function') {
      smoother.paused(!!pause);
      return true;
    }
  } catch {}
  return false;
}

