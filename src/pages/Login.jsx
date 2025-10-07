import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";
import { fetchSignInMethodsForEmail } from "firebase/auth";
import { auth } from "../firebase";
import { useToast } from "../components/general_components/ToastProvider.jsx";

export default function LoginPage() {
  const {
    user,
    profile,
    profileLoading,
    signInWithGoogle,
    logout,
  } = useAuth();
  const [err, setErr] = useState("");
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from") || "/";

  const onGoogle = async () => {
    setErr("");
    try {
      await signInWithGoogle();
      // If profile exists already, go back; else go to setup
      if (!profileLoading && profile) navigate(from, { replace: true });
      else navigate(`/setup?from=${encodeURIComponent(from)}`, { replace: true });
    } catch (e) {
      // Handle account-exists-with-different-credential gracefully
      if (e?.code === "auth/account-exists-with-different-credential") {
        const email = e?.customData?.email;
        if (email) {
          try {
            const methods = await fetchSignInMethodsForEmail(auth, email);
            const pretty = (methods || []).map((m) => {
              if (m === 'password') return 'email + password';
              if (m === 'google.com') return 'Google';
              if (m === 'facebook.com') return 'Facebook';
              if (m === 'apple.com') return 'Apple';
              return m;
            }).join(', ');
            const msg = pretty
              ? `An account with ${email} exists using ${pretty}. Please sign in with that method, then link Google from Account.`
              : `An account with ${email} exists using a different method. Please sign in with that method, then link Google from Account.`;
            setErr(msg);
            showToast("error", msg);
            return;
          } catch {}
        }
      }
      const msg = e?.message || "Unable to sign in with Google";
      setErr(msg);
      showToast("error", msg);
    }
  };

  if (user) {
    return (
      <>
        <SEO title="Account" description="You are logged in to Megance." image="/assets/logo.svg" type="website" twitterCard="summary" />
        <section className="container page-section text-center">
          <h3>You are logged in as {user.displayName || user.email}</h3>
          <button className="butn butn-md butn-rounded mt-20" onClick={() => logout()}>Logout</button>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title="Login" description="Login to Megance to continue to checkout." image="/assets/logo.svg" type="website" twitterCard="summary" />
    <section className="container page-section white-navbar-page">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="p-20 card-like text-center">
            <h3 className="mb-20">Login</h3>
            <p className="inline-hint" style={{marginTop: 0}}>You’ll verify phone in the next step.</p>
            <button className="butn butn-md butn-rounded mt-10" onClick={onGoogle}>Continue with Google</button>
            {err && <div className="mt-15" style={{ color: '#c62828' }}>{err}</div>}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
