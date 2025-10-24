import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageview } from "../../utils/analytics.js";
import { initFBPixel, trackFBPageView } from "../../utils/fbpixel.js";

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    initGA();
    initFBPixel();
    trackPageview(window.location.pathname + window.location.search);
    trackFBPageView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
    trackFBPageView();
  }, [location]);

  return null;
}

