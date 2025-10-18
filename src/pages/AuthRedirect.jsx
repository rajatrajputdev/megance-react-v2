import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from "../firebase";
import { getRedirectResult } from "firebase/auth";

export default function AuthRedirect() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    let done = false;
    (async () => {
      try {
        await getRedirectResult(auth).catch(() => {});
        // Prefer stored post-login target set before starting redirect
        let target = "/";
        try { target = sessionStorage.getItem('postLoginPath') || "/"; } catch {}
        try { sessionStorage.removeItem('postLoginPath'); } catch {}
        // Strip any stub auth params
        try {
          const url = new URL(window.location.href);
          if (url.searchParams.has('authReturn')) {
            url.searchParams.delete('authReturn');
            window.history.replaceState({}, '', url);
          }
        } catch {}
        if (!done) navigate(target, { replace: true });
      } catch {
        if (!done) navigate("/", { replace: true });
      }
    })();
    return () => { done = true; };
  }, [navigate]);

  return (
    <section className="container page-section text-center" aria-busy="true" aria-live="polite">
      <p className="opacity-7">Signing you in…</p>
    </section>
  );
}

