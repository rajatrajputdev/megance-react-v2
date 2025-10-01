import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";

export default function LoginPage() {
  const {
    user,
    profile,
    profileLoading,
    signInWithGoogle,
    logout,
  } = useAuth();
  const [err, setErr] = useState("");
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
      setErr(e.message || "Unable to sign in with Google");
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
    <section className="container page-section">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="p-20 card-like text-center">
            <h3 className="mb-20">Login</h3>
            <button className="butn butn-md butn-rounded mt-10" onClick={onGoogle}>Continue with Google</button>
            {err && <div className="mt-15" style={{ color: '#c62828' }}>{err}</div>}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
