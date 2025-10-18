import { useState, useMemo } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import { isInAppBrowser, preferRedirectAuth } from "../utils/env.js";
import "./login-page.css";

export default function LoginPage() {
  const { user, signInWithGoogle, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [err, setErr] = useState("");

  const from = new URLSearchParams(location.search).get("from") || "/";
  const target = useMemo(() => `/setup?from=${encodeURIComponent(from)}`,[from]);
  const inApp = useMemo(() => isInAppBrowser(), []);
  const forceRedirect = useMemo(() => preferRedirectAuth(), []);

  const goRedirectHandler = () => {
    const handlerPath = `/auth-redirect?start=google&from=${encodeURIComponent(target)}`;
    navigate(handlerPath, { replace: true });
  };

  const onGoogle = async () => {
    setErr("");
    // On iOS/in-app browsers, go straight to redirect handler page.
    if (forceRedirect) return goRedirectHandler();
    try {
      const resultUser = await signInWithGoogle({ postLoginPath: target });
      if (resultUser) navigate(target, { replace: true });
    } catch (e) {
      const code = e?.code || "";
      // If popup fails/blocked, fall back to redirect handler flow.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request" ||
        code === "auth/operation-not-supported-in-this-environment"
      ) {
        return goRedirectHandler();
      }
      const msg = e?.message || "Unable to sign in with Google";
      setErr(msg);
      showToast("error", msg);
    }
  };

  if (user) {
    return (
      <>
        <SEO title="Account" />
        <section className="container page-section text-center">
          <h3>You are logged in as {user.displayName || user.email}</h3>
          <div className="mt-20">
            <button className="butn butn-md butn-rounded mr-10" onClick={() => navigate(from || "/", { replace: true })}>
              Continue
            </button>
            <button className="butn butn-md butn-rounded" onClick={logout}>Logout</button>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title="Login" />
      <div className="auth-wrapper">
        <div className="auth-image" style={{ backgroundImage: `url(/assets/imgs/login/l1.png)` }} />
        <div className="auth-card">
          {inApp && (
            <div className="auth-error" style={{ marginBottom: 12 }}>
              You appear to be in an in‑app browser. If the button below doesn’t work, use the menu to “Open in Browser” and try again.
            </div>
          )}
          <h2 className="auth-title">Sign in to Megance</h2>
          <p className="auth-subtext">Use your Google account to continue.</p>

          <button className="google-btn" onClick={onGoogle}>
            <span className="google-icon">
              <svg width="18" height="18" viewBox="0 0 533.5 544.3" aria-hidden="true">
                <path fill="#4285F4" d="M533.5,278.4c0-17.4-1.5-34.1-4.3-50.3H272v95.3h147c-6.3,33.7-25,62.1-53.5,81.2l86.4,67.1 c50.4-46.5,81.6-115,81.6-193.3z"/>
                <path fill="#34A853" d="M272,544.3c72.9,0,134.1-24.1,178.8-65.3l-86.4-67.1c-24.1,16.2-55,25.8-92.4,25.8 c-70.9,0-130.9-47.9-152.4-112.3l-89.2,69.1C71.7,486.3,164.6,544.3,272,544.3z"/>
                <path fill="#FBBC05" d="M119.6,325.4c-4.5-13.3-7-27.5-7-42.4c0-14.9,2.5-29.1,7-42.4l-89.2-69.1C10.7,203.3,0,239.3,0,283 c0,43.7,10.7,79.7,30.4,111.5L119.6,325.4z"/>
                <path fill="#EA4335" d="M272,109.7c39.7,0,75.3,13.7,103.4,40.6l77.5-77.5C406.1,24.1,344.9,0,272,0C164.6,0,71.7,57.9,30.4,141.5 l89.2,69.1C141.1,157.6,201.1,109.7,272,109.7z"/>
              </svg>
            </span>
            Continue with Google
          </button>

          <div className="auth-subtext" style={{ marginTop: 12 }}>
            Trouble signing in?
            <button className="underline ml-6" onClick={goRedirectHandler}>
              Use redirect login
            </button>
          </div>

          {err && <div className="auth-error">{err}</div>}
        </div>
      </div>
    </>
  );
}
