import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// Watches for the auth redirect flag and forwards to the handler page.
export default function AuthReturnGate() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    try {
      // Avoid interfering while already on the handler route
      if (location.pathname === "/auth-redirect") return;
      const params = new URLSearchParams(location.search);
      if (params.has("authReturn")) {
        navigate("/auth-redirect", { replace: true });
      }
    } catch {}
  }, [location.pathname, location.search, navigate]);

  return null;
}

