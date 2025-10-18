import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getRedirectResult } from "firebase/auth";
import "./auth-redirect.css"; // ✅ create this for styling

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("Signing you in…");

  useEffect(() => {
    let done = false;

    (async () => {
      try {
        setStatusText("Verifying authentication…");
        try {
          const res = await getRedirectResult(auth);
          if (res?.user) {
            // Helpful debug for diagnosing issues if needed
            try { console.debug("[AuthRedirect] Signed in:", res.user.uid); } catch {}
          }
        } catch (e) {
          // Log underlying Firebase error for troubleshooting, but continue
          try { console.error("[AuthRedirect] getRedirectResult error:", e); } catch {}
        }

        let target = "/";
        try {
          const stored = sessionStorage.getItem("postLoginPath");
          if (stored) target = stored;
          sessionStorage.removeItem("postLoginPath");
        } catch {}

        setStatusText("Redirecting…");

        if (!done) navigate(target, { replace: true });
      } catch (e) {
        try { console.error("[AuthRedirect] unexpected error:", e); } catch {}
        if (!done) navigate("/", { replace: true });
      }
    })();

    return () => {
      done = true;
    };
  }, [navigate]);

  return (
    <div className="auth-redirect-wrapper">
      <div className="auth-redirect-content">
        <img src="/assets/imgs/logo.svg" alt="Megance" className="auth-redirect-logo" />
        <p className="auth-redirect-status">{statusText}</p>
      </div>
    </div>
  );
}
