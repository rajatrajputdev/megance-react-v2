import { useState, useEffect, useMemo } from "react"; 
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import "./login-page.css";

export default function LoginPage() {
  const {
    user,
    signInWithGoogle,
    logout,
    redirectError,
  } = useAuth();
  const [err, setErr] = useState("");
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from") || "/";

  // ✅ Desktop & Mobile image logic
  const desktopImage = "/assets/imgs/login/l1.png"; // 🔁 Replace later
  const mobileImage = "/assets/imgs/login/l1mob.png"; // 🔁 Replace later
  const [bgImage, setBgImage] = useState(desktopImage);
  const envHints = useMemo(() => {
    try {
      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
      const isStandalonePWA = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || (navigator && (navigator).standalone === true);
      const isInApp = /(FBAN|FBAV|Instagram|Line|Twitter|GSA|OkHttp)/i.test(ua);
      return { isIOS, isStandalonePWA, isInApp };
    } catch { return { isIOS: false, isStandalonePWA: false, isInApp: false }; }
  }, []);

  useEffect(() => {
    const updateImage = () => {
      if (window.innerWidth <= 768) {
        setBgImage(mobileImage);
      } else {
        setBgImage(desktopImage);
      }
    };
    updateImage();
    window.addEventListener("resize", updateImage);
    return () => window.removeEventListener("resize", updateImage);
  }, []);

  const onGoogle = async (forceRedirect = false) => {
    setErr("");
    try {
      await signInWithGoogle({ postLoginPath: `/setup?from=${encodeURIComponent(from)}`, forceRedirect });
      // Popup flow returns immediately with user; redirect flow leaves the page.
      // If popup succeeded, navigate now. If redirect chosen, the stored postLoginPath will handle it after return.
      if (auth.currentUser) {
        navigate(`/setup?from=${encodeURIComponent(from)}`, { replace: true });
      }
    } catch (e) {
      const code = e?.code || '';
      let msg = "";
      if (String(code).includes('unauthorized-domain')) {
        msg = "Sign-in is not available on this domain.";
      } else if (String(code).includes('popup-blocked')) {
        msg = "Popup blocked. Use the redirect option below.";
      } else if (String(code).includes('operation-not-supported-in-this-environment')) {
        msg = "This browser blocks Google popups. Use redirect below.";
      } else if (String(code).includes('cancelled-popup-request') || String(code).includes('popup-closed-by-user')) {
        msg = "The sign-in window was closed before completing.";
      } else {
        msg = e?.message || "Unable to sign in with Google.";
      }
      setErr(msg);
      showToast("error", msg);
    }
  };

  // After redirect sign-in completes, navigate using stored target if available
  useEffect(() => {
    if (!user) return;
    try {
      const target = sessionStorage.getItem('postLoginPath');
      if (target) {
        sessionStorage.removeItem('postLoginPath');
        navigate(target, { replace: true });
      }
    } catch {}
  }, [user, navigate]);

  // Surface redirect errors after returning from Google
  useEffect(() => {
    if (!redirectError) return;
    const code = redirectError?.code || '';
    let msg = '';
    if (String(code).includes('unauthorized-domain')) msg = 'Sign-in is not available on this domain.';
    else if (String(code).includes('operation-not-supported-in-this-environment')) msg = 'This browser blocks Google sign-in. Use the redirect option below or open in your default browser.';
    else if (String(code).includes('popup-blocked')) msg = 'Popup blocked. Use the redirect option below.';
    else msg = redirectError?.message || 'Could not complete Google sign-in.';
    setErr(msg);
    showToast('error', msg);
  }, [redirectError]);

  if (user) {
    return (
      <>
        <SEO title="Account" />
        <section className="container page-section text-center">
          <h3>You are logged in as {user.displayName || user.email}</h3>
          <button className="butn butn-md butn-rounded mt-20" onClick={logout}>Logout</button>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title="Login" />
      <div className="auth-wrapper">
        <div
          className="auth-image"
          style={{ backgroundImage: `url(${bgImage})` }} // ✅ Dynamic Image Here
        ></div>
        <div className="auth-card">
          <h2 className="auth-title">Welcome Back</h2>
          <p className="auth-subtext">Sign in to continue your journey.</p>

          {/* Primary CTA: decide best mode based on environment */}
          <button className="google-btn" onClick={() => onGoogle(envHints.isIOS || envHints.isStandalonePWA || envHints.isInApp)}>
            <span className="google-icon">
              <svg width="18" height="18" viewBox="0 0 533.5 544.3">
                <path fill="#4285F4" d="M533.5,278.4c0-17.4-1.5-34.1-4.3-50.3H272v95.3h147c-6.3,33.7-25,62.1-53.5,81.2l86.4,67.1 c50.4-46.5,81.6-115,81.6-193.3z"/>
                <path fill="#34A853" d="M272,544.3c72.9,0,134.1-24.1,178.8-65.3l-86.4-67.1c-24.1,16.2-55,25.8-92.4,25.8 c-70.9,0-130.9-47.9-152.4-112.3l-89.2,69.1C71.7,486.3,164.6,544.3,272,544.3z"/>
                <path fill="#FBBC05" d="M119.6,325.4c-4.5-13.3-7-27.5-7-42.4c0-14.9,2.5-29.1,7-42.4l-89.2-69.1C10.7,203.3,0,239.3,0,283 c0,43.7,10.7,79.7,30.4,111.5L119.6,325.4z"/>
                <path fill="#EA4335" d="M272,109.7c39.7,0,75.3,13.7,103.4,40.6l77.5-77.5C406.1,24.1,344.9,0,272,0C164.6,0,71.7,57.9,30.4,141.5 l89.2,69.1C141.1,157.6,201.1,109.7,272,109.7z"/>
              </svg>
            </span>
            Continue with Google
          </button>

          {/* Secondary: explicit redirect option for stubborn browsers */}
          <div className="mt-20" style={{textAlign:'center'}}>
            <button className="butn butn-md butn-rounded" onClick={() => onGoogle(true)}>
              Continue via Redirect
            </button>
            <div className="inline-hint mt-6" aria-live="polite">
              {envHints.isInApp
                ? 'If using Instagram or Facebook browser, tap ••• and open in Safari if redirect does not start.'
                : envHints.isIOS
                ? 'iOS may block popups. Redirect opens Google in this tab.'
                : 'If a popup is blocked, use redirect instead.'}
            </div>
          </div>

          {err && <div className="auth-error">{err}</div>}
        </div>
      </div>
    </>
  );
}
