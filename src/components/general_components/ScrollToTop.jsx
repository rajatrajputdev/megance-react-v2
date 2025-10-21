import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { disableScrollRestorationDuringInteraction } from "../homepage_components/disableScrollRestoration";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // If there's a hash, perform a controlled anchor scroll to avoid jump/flicker
    if (location?.hash) {
      const id = location.hash.replace(/^#/, "");
      const scrollToAnchor = () => {
        try {
          const el = document.getElementById(id);
          if (!el) return false;
          // Prefer GSAP ScrollSmoother when present for stability
          if (typeof window !== "undefined" && window.ScrollSmoother && window.ScrollSmoother.get) {
            const sm = window.ScrollSmoother.get();
            if (sm && typeof sm.scrollTo === "function") {
              sm.scrollTo(el, true);
              return true;
            }
          }
          // Native stable scroll
          try { el.scrollIntoView({ behavior: "smooth", block: "start", inline: "nearest" }); } catch { el.scrollIntoView(true); }
          return true;
        } catch { return false; }
      };

      // Try a few frames in case the element mounts late or vendors initialize
      let tries = 0;
      const tryLoop = () => {
        tries += 1;
        if (scrollToAnchor() || tries > 6) return;
        try { requestAnimationFrame(tryLoop); } catch { setTimeout(tryLoop, 50); }
      };
      tryLoop();
      return; // skip the generic scroll-to-top
    }
    try { disableScrollRestorationDuringInteraction(); } catch {}
    const doScrollTop = () => {
      try {
        if (typeof window !== "undefined" && window.ScrollSmoother && window.ScrollSmoother.get) {
          const smoother = window.ScrollSmoother.get();
          if (smoother && typeof smoother.scrollTo === "function") {
            smoother.scrollTo(0, true);
            return true;
          }
        }
      } catch {}
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        try { window.scrollTo(0, 0); } catch {}
      }
      return true;
    };

    // Try immediately, then retry up to a few frames in case GSAP initializes late
    let attempts = 0;
    const tryLoop = () => {
      attempts += 1;
      doScrollTop();
      if (attempts < 3) {
        try { requestAnimationFrame(tryLoop); } catch {}
      }
    };
    tryLoop();
  }, [location.pathname, location.search, location.key]);

  return null; // this component doesn’t render anything
};

export default ScrollToTop;
