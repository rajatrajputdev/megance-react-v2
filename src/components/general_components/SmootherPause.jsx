import { useEffect } from "react";

// Pauses GSAP ScrollSmoother while this component is mounted to prevent
// scroll jumps during heavy DOM interactions (forms, dynamic lists).
export default function SmootherPause({ enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    let sm = null;
    try {
      if (typeof window !== 'undefined' && window.ScrollSmoother && window.ScrollSmoother.get) {
        sm = window.ScrollSmoother.get();
        if (sm && typeof sm.paused === 'function') sm.paused(true);
      }
    } catch {}
    return () => {
      try { if (sm && typeof sm.paused === 'function') sm.paused(false); } catch {}
    };
  }, [enabled]);
  return null;
}

