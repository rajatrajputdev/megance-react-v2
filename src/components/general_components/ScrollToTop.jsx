import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    // Respect in-page anchor navigation: if there's a hash, let the browser/GSAP handle it
    if (location?.hash) return;
    try {
      if (typeof window !== "undefined" && window.ScrollSmoother && window.ScrollSmoother.get) {
        const smoother = window.ScrollSmoother.get();
        if (smoother && typeof smoother.scrollTo === "function") {
          smoother.scrollTo(0, true);
          return;
        }
      }
    } catch {}
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      try { window.scrollTo(0, 0); } catch {}
    }
  }, [location.pathname, location.search, location.key]);

  return null; // this component doesn’t render anything
};

export default ScrollToTop;
