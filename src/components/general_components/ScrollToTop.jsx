import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { disableScrollRestorationDuringInteraction } from "../homepage_components/disableScrollRestoration";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Respect in-page anchor navigation: if there's a hash, let the browser/GSAP handle it
    if (location?.hash) return;
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
