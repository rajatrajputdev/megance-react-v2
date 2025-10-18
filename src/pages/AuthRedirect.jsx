import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../firebase";
import { getRedirectResult, GoogleAuthProvider, signInWithRedirect } from "firebase/auth";
import "./auth-redirect.css"; // ✅ create this for styling

export default function AuthRedirect() {
  const navigate = useNavigate();
  const [statusText, setStatusText] = useState("Signing you in…");

  useEffect(() => {
    let done = false;

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const start = params.get("start");
        const from = params.get("from") || "/";

        // If explicitly asked to start a provider redirect, do it here.
        if (start === "google") {
          try { sessionStorage.setItem("postLoginPath", from); } catch {}
          try {
            const url = new URL(window.location.href);
            url.searchParams.delete("start");
            url.searchParams.set("authReturn", "1");
            url.searchParams.set("from", from);
            window.history.replaceState({}, "", url);
          } catch {}
          setStatusText("Opening Google…");
          const provider = new GoogleAuthProvider();
          try { provider.setCustomParameters({ prompt: "select_account" }); } catch {}
          await signInWithRedirect(auth, provider);
          return; // navigation away
        }

        setStatusText("Verifying authentication…");
        try {
          const res = await getRedirectResult(auth);
          if (res?.user) {
            try { console.debug("[AuthRedirect] Signed in:", res.user.uid); } catch {}
          }
        } catch (e) {
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
