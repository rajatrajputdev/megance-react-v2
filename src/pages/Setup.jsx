import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { useLocation, useNavigate } from "react-router-dom";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import SEO from "../components/general_components/SEO.jsx";
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

  const isPhoneVerified = Boolean(user?.phoneNumber) || profile?.phoneVerified === true || otpVerified === true;
  const canSave = !!form.name && !!form.phone && !!form.address && !!form.city && !!form.state && !!form.zip && isPhoneVerified;

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const saveProfile = async () => {
    if (!user) return;
    setSaving(true);
    setErr("");
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: form.name || user.displayName || "",
          email: user.email || "",
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          phoneVerified: true,
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      navigate(from, { replace: true });
    } catch (e) {
      setErr(e.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async () => {
    setErr(""); setMsg("");
    setSendingOtp(true);
    try {
      await startLinkPhone(form.phone);
      setOtpSent(true);
      setMsg("OTP sent to your phone");
    } catch (e) {
      setErr(e.message || "Failed to send OTP");
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setErr(""); setMsg("");
    setVerifyingOtp(true);
    try {
      await confirmLinkPhone(otpCode);
      setOtpVerified(true);
      setMsg("Phone verified");
    } catch (e) {
      setErr(e.message || "Invalid OTP");
    } finally {
      setVerifyingOtp(false);
    }
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
                    <input className="form-control" name="name" value={form.name} onChange={onChange} placeholder="Full name" />
                  </div>
                  <div className="col-md-6 mb-10">
                    <label>Phone {isPhoneVerified && <span className="badge success ml-10">Verified</span>}</label>
                    <input
                      className="form-control"
                      name="phone"
                      value={form.phone}
                      onChange={onChange}
                      placeholder="e.g. +91XXXXXXXXXX"
                      disabled={isPhoneVerified}
                    />
                    {!isPhoneVerified && (
                      <div className="otp-section mt-6">
                        {!otpSent ? (
                          <>
                            <div className="form-hint">We’ll send a one-time code to verify this number.</div>
                            <button type="button" className="butn butn-sm butn-rounded mt-6" disabled={sendingOtp} onClick={sendOtp}>{sendingOtp ? "Sending…" : "Send OTP"}</button>
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
                                onChange={(e) => setOtpCode(e.target.value)}
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
                    <input className="form-control" name="address" value={form.address} onChange={onChange} />
                  </div>
                  <div className="col-md-4 mb-10">
                    <label>City</label>
                    <input className="form-control" name="city" value={form.city} onChange={onChange} />
                  </div>
                  <div className="col-md-4 mb-10">
                    <label>State</label>
                    <select className="form-control" name="state" value={form.state} onChange={onChange}>
                      <option value="">Select State/UT</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4 mb-10">
                    <label>PIN Code</label>
                    <input className="form-control" name="zip" value={form.zip} onChange={onChange} />
                  </div>
                </div>
                <div className="d-flex justify-content-end mt-10">
                  <button className="butn butn-md butn-rounded" disabled={!canSave || saving} onClick={saveProfile}>
                    {saving ? "Saving…" : "Save & Continue"}
                  </button>
                </div>
                {!isPhoneVerified && <div className="inline-hint">Verify your phone to enable Save.</div>}
                <div id="recaptcha-container" className="recaptcha-holder" aria-hidden="true"></div>
                {msg && <div className="alert success mt-10">{msg}</div>}
                {err && <div className="alert error mt-10">{err}</div>}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
