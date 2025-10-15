import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
// Profile is updated via server function; no direct Firestore writes here
import { updateUserProfileServer } from "../services/profile.js";
import SEO from "../components/general_components/SEO.jsx";
import { friendlyOtpError } from "../utils/errors.js";
import { INDIAN_STATES } from "../data/indian-states.js";

export default function Setup() {
  const { user, profile, profileLoading, startLinkPhone, confirmLinkPhone } = useAuth();
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  // Cooldown removed for simplicity (instant resend allowed)
  const otpInputRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();
  const from = new URLSearchParams(location.search).get("from") || "/";

  const [form, setForm] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  useEffect(() => {
    if (!user) return;
    // Prefill name/email if available
    setForm((f) => ({
      ...f,
      name: user.displayName || f.name,
    }));
  }, [user]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      phone: (profile?.phone || user?.phoneNumber || f.phone),
    }));
  }, [user, profile]);

  useEffect(() => {
    if (user && !profileLoading && profile) {
      // Already set up
      navigate(from, { replace: true });
    }
  }, [user, profile, profileLoading]);

  // Autofocus OTP when sent
  useEffect(() => {
    if (otpSent) {
      setTimeout(() => { try { otpInputRef.current?.focus(); } catch {} }, 0);
    }
  }, [otpSent]);

  // No cooldown timers

  // Treat server-auth phone as source of truth; otpVerified just gates the UI button
  const isPhoneVerified = Boolean(user?.phoneNumber) || profile?.phoneVerified === true || otpVerified === true;
  const canSave = !!form.name && !!form.phone && !!form.address && !!form.city && !!form.state && !!form.zip && isPhoneVerified;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setErr("");
    try {
      // Use server to persist profile; server derives phone + phoneVerified from auth
      await updateUserProfileServer({
        name: form.name || user.displayName || "",
        email: user.email || "",
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
      });
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  // No cooldown logic

  const sendOtp = async () => {
    setErr(""); setMsg("");
    setSendingOtp(true);
    try {
      await startLinkPhone(form.phone);
      setOtpCode("");
      setErr("");
      setOtpSent(true);
      setMsg("OTP sent to your phone");
    } catch (e) {
      // Surface debug info in console for troubleshooting recaptcha/OTP issues
      try { console.error('[OTP][send] error', e?.code || e, e); } catch {}
      setErr(friendlyOtpError(e, 'send'));
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setErr(""); setMsg("");
    setVerifyingOtp(true);
    try {
      const u = await confirmLinkPhone(otpCode);
      try { if (u?.phoneNumber) setForm((f) => ({ ...f, phone: u.phoneNumber })); } catch {}
      setOtpVerified(true);
      setMsg("Phone verified");
    } catch (e) {
      // Helpful console for non-UI debugging
      try { console.error('[OTP][verify] error', e?.code || e, e); } catch {}
      setErr(friendlyOtpError(e, 'verify'));
      setOtpCode("");
    } finally {
      setVerifyingOtp(false);
    }
  };

  const onOtpInput = (e) => {
    try {
      const v = String(e.target.value || '').replace(/\D/g, '').slice(0, 6);
      setOtpCode(v);
    } catch { setOtpCode(''); }
  };

  return (
    <>
      <SEO title="Setup" description="Complete your profile to continue." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page">
        <div className="row justify-content-center">
          <div className="col-lg-7">
            <div className="p-20 card-like">
              <h3 className="mb-10">Welcome{user?.displayName ? `, ${user.displayName}` : ""}</h3>
              <p className="opacity-7">Just a few details to personalize your experience.</p>

              <div className="mt-20">
                <div className="row">
                  <div className="col-md-6 mb-10">
                    <label>Name</label>
                    <input className="form-control" name="name" value={form.name} onChange={onChange} placeholder="Full name" aria-invalid={!form.name} />
                    {!form.name && !canSave && <div className="inline-error">Name is required</div>}
                  </div>
                  <div className="col-md-6 mb-10">
                    <label>Phone {isPhoneVerified && <span className="badge success ml-10">Verified</span>}</label>
                    <input
                      className="form-control"
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      placeholder="e.g. +919876543210"
                      inputMode="tel"
                      pattern="^\\+?\\d{10,15}$"
                      title="Enter 10–15 digits, optionally starting with +"
                      disabled={isPhoneVerified}
                      aria-invalid={!isPhoneVerified && !form.phone}
                    />
                    {!isPhoneVerified && (
                      <div className="otp-section mt-6">
                        {!otpSent ? (
                          <>
                            <div className="form-hint">We’ll send a one-time code to verify this number.</div>
                            <button type="button" className="butn butn-sm butn-rounded mt-6" disabled={sendingOtp || !form.phone} onClick={sendOtp}>{sendingOtp ? "Sending…" : "Send OTP"}</button>
                          </>
                        ) : (
                          <>
                            <label className="mt-4">Enter OTP Code</label>
                            <div className="otp-inline mt-4">
                              <input
                                className="form-control otp-code-input"
                                placeholder="6-digit code"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                maxLength={6}
                                value={otpCode}
                                onChange={onOtpInput}
                                ref={otpInputRef}
                              />
                              <button type="button" className="butn butn-sm butn-rounded" disabled={verifyingOtp} onClick={verifyOtp}>{verifyingOtp ? "Verifying…" : "Verify OTP"}</button>
                              <button type="button" className="underline" disabled={sendingOtp} onClick={sendOtp}>Resend</button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                    {isPhoneVerified && <div className="inline-hint" style={{color:'#1aa34a'}}>Your phone number is verified.</div>}
                  </div>
                  <div className="col-12 mb-10">
                    <label>Street Address</label>
                    <input className="form-control" name="address" value={form.address} onChange={onChange} aria-invalid={!form.address} />
                    {!form.address && !canSave && <div className="inline-error">Street address is required</div>}
                  </div>
                  <div className="col-md-4 mb-10">
                    <label>City</label>
                    <input className="form-control" name="city" value={form.city} onChange={onChange} aria-invalid={!form.city} />
                    {!form.city && !canSave && <div className="inline-error">City is required</div>}
                  </div>
                  <div className="col-md-4 mb-10">
                    <label>State</label>
                    <select className="form-control" name="state" value={form.state} onChange={onChange} aria-invalid={!form.state}>
                      <option value="">Select State/UT</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    {!form.state && !canSave && <div className="inline-error">State is required</div>}
                  </div>
                  <div className="col-md-4 mb-10">
                    <label>PIN Code</label>
                    <input className="form-control" name="zip" value={form.zip} onChange={onChange} aria-invalid={!form.zip} />
                    {!form.zip && !canSave && <div className="inline-error">PIN code is required</div>}
                  </div>
                </div>
                <div className="d-flex justify-content-end mt-10">
                  <button className="butn butn-md butn-rounded" disabled={!canSave || saving} onClick={saveProfile}>
                    {saving ? "Saving…" : "Save & Continue"}
                  </button>
                </div>
                {!isPhoneVerified && <div className="inline-hint">Verify your phone to enable Save.</div>}
                {/* Per-field missing hints when disabled */}
                {!canSave && (
                  <div className="inline-hint mt-6">Fill all fields marked above to continue.</div>
                )}
                {/* Recaptcha host is mounted globally; no per-page container needed */}
                {msg && <div className="alert success mt-10" role="status" aria-live="polite">{msg}</div>}
                {err && <div className="alert error mt-10" role="alert" aria-live="assertive">{err}</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
