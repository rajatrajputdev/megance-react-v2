import { useState, useEffect } from "react"; 
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
  } = useAuth();
  const [err, setErr] = useState("");
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from") || "/";
  const [isMobile, setIsMobile] = useState(false);

  // ✅ Desktop & Mobile image logic
  const desktopImage = "/assets/imgs/login/l1.png"; // 🔁 Replace later
  const mobileImage = "/assets/imgs/login/l1mob.png"; // 🔁 Replace later
  const [bgImage, setBgImage] = useState(desktopImage);

  useEffect(() => {
    const updateImage = () => {
      if (window.innerWidth <= 768) {
        setBgImage(mobileImage);
      } else {
        setBgImage(desktopImage);
      }
    };
    try {
      const ua = navigator.userAgent || "";
      setIsMobile(/Mobi|Android|iPhone|iPad|iPod/i.test(ua));
    } catch {}
    updateImage();
    window.addEventListener("resize", updateImage);
    return () => window.removeEventListener("resize", updateImage);
  }, []);

  const onGoogle = async () => {
    setErr("");
    try {
      const target = `/setup?from=${encodeURIComponent(from)}`;
      try { sessionStorage.setItem('postLoginPath', target); } catch {}
      // On phones, explicitly ask users to allow pop-ups so Google can open
      if (isMobile) {
        const ok = window.confirm(
          "To continue, allow pop-ups so Google Sign-In can open. Continue?"
        );
        if (!ok) return;
      }
      const resultUser = await signInWithGoogle({ postLoginPath: target });
      // Popup flow returns immediately with user; redirect flow leaves the page.
      // If popup succeeded, navigate now. If redirect chosen, the stored postLoginPath will handle it after return.
      if (resultUser) navigate(target, { replace: true });
    } catch (e) {
      const msg = e?.message || "Unable to sign in with Google";
      setErr(msg);
      showToast("error", msg);
    }
  };

  // After redirect sign-in completes, navigate using stored target if available
  useEffect(() => {
    if (!user) return;
    try {
      const url = new URL(window.location.href);
      const authReturn = url.searchParams.get('authReturn');
      const target = sessionStorage.getItem('postLoginPath');
      if (target) {
        sessionStorage.removeItem('postLoginPath');
        // clean marker param if present
        if (authReturn) { url.searchParams.delete('authReturn'); window.history.replaceState({}, '', url); }
        navigate(target, { replace: true });
        return;
      }
      // Fallback: if we detect we returned from auth but no stored target, go to Setup
      if (authReturn) {
        url.searchParams.delete('authReturn');
        window.history.replaceState({}, '', url);
        navigate(`/setup?from=${encodeURIComponent(from)}`, { replace: true });
      }
    } catch {}
  }, [user, navigate]);

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

          <button className="google-btn" onClick={onGoogle}>
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

          {isMobile && (
            <div className="auth-subtext" style={{ marginTop: 10 }}>
              Tip- On phones, allow pop-ups so Google can open. If blocked, we’ll redirect automatically.
            </div>
          )}

          {err && <div className="auth-error">{err}</div>}
        </div>
      </div>
    </>
  );
}
