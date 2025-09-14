import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useNavigate, useLocation } from "react-router-dom";
import SEO from "../components/general_components/SEO.jsx";

export default function LoginPage() {
  const {
    user,
    initializing,
    // email/password
    registerWithEmail,
    loginWithEmail,
    resendVerificationEmail,
    // email link
    sendEmailLink,
    completeEmailLink,
    // phone otp
    startPhoneSignIn,
    confirmPhoneCode,
    logout,
  } = useAuth();
  const [mode, setMode] = useState("email"); // email | link | phone
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from") || "/";

  useEffect(() => {
    (async () => {
      const res = await completeEmailLink();
      if (res) navigate(from, { replace: true });
    })();
  }, []);

  const onSubmitEmail = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      if (isRegister) {
        await registerWithEmail(email, password, name);
        setMsg("Account created. Check your inbox to verify your email.");
      } else {
        await loginWithEmail(email, password);
        navigate(from, { replace: true });
      }
    } catch (e) {
      setErr(e.message || "Unable to process request");
    }
  };

  const onSendLink = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await sendEmailLink(email);
      setMsg("Magic link sent. Check your email to complete sign-in.");
    } catch (e) {
      setErr(e.message || "Unable to send link");
    }
  };

  const onStartPhone = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await startPhoneSignIn(phone);
      setOtpSent(true);
      setMsg("OTP sent to your phone.");
    } catch (e) {
      setErr(e.message || "Failed to send OTP");
    }
  };

  const onVerifyCode = async (e) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      await confirmPhoneCode(code);
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Invalid code");
    }
  };

  if (user) {
    return (
      <>
        <SEO title="Account" description="You are logged in to Megance." image="/assets/logo.svg" type="website" twitterCard="summary" />
        <section className="container page-section text-center">
          <h3>You are logged in as {user.displayName || user.email || user.phoneNumber}</h3>
          {user.email && !user.emailVerified && (
            <p className="mt-10">Your email is not verified. <button className="underline" onClick={resendVerificationEmail}>Resend verification email</button></p>
          )}
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
          <div className="p-20 card-like">
            <h3 className="mb-20">Login</h3>

            <div className="filter-pills mb-20">
              <button className={`pill${mode === 'email' ? ' active' : ''}`} onClick={() => setMode('email')}>Email & Password</button>
              <button className={`pill${mode === 'link' ? ' active' : ''}`} onClick={() => setMode('link')}>Email Link</button>
              <button className={`pill${mode === 'phone' ? ' active' : ''}`} onClick={() => setMode('phone')}>Phone OTP</button>
            </div>

            {mode === 'email' && (
              <form onSubmit={onSubmitEmail}>
                <div className="mb-10">
                  <label>Name</label>
                  <input className="form-control" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name (optional)" />
                </div>
                <div className="mb-10">
                  <label>Email</label>
                  <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <div className="mb-10">
                  <label>Password</label>
                  <input className="form-control" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <div className="d-flex align-items-center mb-10">
                  <input id="reg" type="checkbox" checked={isRegister} onChange={(e) => setIsRegister(e.target.checked)} className="mr-10" />
                  <label htmlFor="reg" className="mb-0">Create a new account</label>
                </div>
                <button className="butn butn-md butn-rounded mt-10" type="submit">{isRegister ? 'Register' : 'Login'}</button>
              </form>
            )}

            {mode === 'link' && (
              <form onSubmit={onSendLink}>
                <div className="mb-10">
                  <label>Email</label>
                  <input className="form-control" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                <button className="butn butn-md butn-rounded mt-10" type="submit">Send magic link</button>
                <p className="mt-10 opacity-7">We will email you a sign-in link. Open it on this device to finish login.</p>
              </form>
            )}

            {mode === 'phone' && (
              <>
                {!otpSent ? (
                  <form onSubmit={onStartPhone}>
                    <div className="mb-10">
                      <label>Phone number</label>
                      <input className="form-control" type="tel" placeholder="+91XXXXXXXXXX" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                    </div>
                    <div id="recaptcha-container"></div>
                    <button className="butn butn-md butn-rounded mt-10" type="submit">Send OTP</button>
                  </form>
                ) : (
                  <form onSubmit={onVerifyCode}>
                    <div className="mb-10">
                      <label>Enter OTP</label>
                      <input className="form-control" value={code} onChange={(e) => setCode(e.target.value)} required />
                    </div>
                    <button className="butn butn-md butn-rounded mt-10" type="submit">Verify & Login</button>
                  </form>
                )}
              </>
            )}

            {msg && <div className="mt-15" style={{ color: '#1aa34a' }}>{msg}</div>}
            {err && <div className="mt-15" style={{ color: '#c62828' }}>{err}</div>}
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
