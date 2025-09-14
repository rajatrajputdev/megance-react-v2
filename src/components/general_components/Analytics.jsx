import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { initGA, trackPageview } from "../../utils/analytics.js";

export default function Analytics() {
  const location = useLocation();

  useEffect(() => {
    initGA();
    trackPageview(window.location.pathname + window.location.search);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    trackPageview(location.pathname + location.search);
  }, [location]);

  return null;
}

