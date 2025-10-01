import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebase.js";
import SEO from "../components/general_components/SEO.jsx";
import { INDIAN_STATES } from "../data/indian-states.js";

export default function Account() {
  const { user, profile, profileLoading, logout, startLinkPhone, confirmLinkPhone, startChangePhone, confirmChangePhone } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null); // { type, text }
  const timerRef = useRef(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [editingPhone, setEditingPhone] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: (profile?.name || user?.displayName) || "",
      email: (profile?.email || user?.email) || "",
      phone: profile?.phone || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip: profile?.zip || "",
    }));
  }, [user, profile]);

  useEffect(() => {
    if (!toast) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setToast(null), 2200);
    return () => timerRef.current && clearTimeout(timerRef.current);
  }, [toast]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const hasLinkedPhone = Boolean(user?.phoneNumber);
  const baseVerified = hasLinkedPhone || profile?.phoneVerified === true;
  const effectiveVerified = (baseVerified && !editingPhone) || otpVerified === true;
  const canSave = !!form.name && !!form.email && !!form.phone && !!form.address && !!form.city && !!form.state && !!form.zip && (!editingPhone || otpVerified === true);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          name: form.name,
          email: form.email,
          phone: form.phone,
          address: form.address,
          city: form.city,
          state: form.state,
          zip: form.zip,
          phoneVerified: effectiveVerified,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setToast({ type: "success", text: "Profile saved" });
    } catch (e) {
      setToast({ type: "error", text: e.message || "Failed to save" });
    } finally {
      setSaving(false);
    }
  };

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      if (editingPhone || baseVerified) await startChangePhone(form.phone);
      else await startLinkPhone(form.phone);
      setOtpSent(true);
      setToast({ type: "info", text: "OTP sent" });
    } catch (e) {
      setToast({ type: "error", text: e.message || "Failed to send OTP" });
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setVerifyingOtp(true);
    try {
      if (editingPhone || baseVerified) await confirmChangePhone(otpCode);
      else await confirmLinkPhone(otpCode);
      setOtpVerified(true);
      setEditingPhone(false);
      setToast({ type: "success", text: "Phone verified" });
    } catch (e) {
      setToast({ type: "error", text: e.message || "Invalid OTP" });
    } finally {
      setVerifyingOtp(false);
    }
  };

  return (
    <>
      <SEO title="Account" description="Manage your Megance account." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page">
        {toast && (
          <div className="toast-container">
            <div className={`alert-toast ${toast.type}`}>
              <span className="dot" />
              <span>{toast.text}</span>
            </div>
          </div>
        )}

        <div className="row">
          <div className="col-lg-7">
            <div className="p-20 card-like">
              <h3 className="mb-10">Your Account</h3>
              <p className="opacity-7">Update your profile information and contact details.</p>
              <div className="row mt-10">
                <div className="col-md-6 mb-10">
                  <label>Name</label>
                  <input className="form-control" name="name" value={form.name} onChange={onChange} />
                </div>
                <div className="col-md-6 mb-10">
                  <label>Email</label>
                  <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} />
                </div>
                <div className="col-md-6 mb-10">
                  <label>
                    Phone {effectiveVerified && !editingPhone && <span className="badge success ml-10">Verified</span>}
                    {effectiveVerified && !editingPhone && (
                      <button type="button" className="underline ml-10" onClick={() => { setEditingPhone(true); setOtpSent(false); setOtpCode(""); setOtpVerified(false); }}>Change</button>
                    )}
                  </label>
                  <input className="form-control" name="phone" value={form.phone} onChange={onChange} disabled={effectiveVerified && !editingPhone} />
                  {(!effectiveVerified || editingPhone) && (
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
                            <input className="form-control otp-code-input" placeholder="6-digit code" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otpCode} onChange={(e)=>setOtpCode(e.target.value)} />
                            <button type="button" className="butn butn-sm butn-rounded" disabled={verifyingOtp} onClick={verifyOtp}>{verifyingOtp ? "Verifying…" : "Verify OTP"}</button>
                            <button type="button" className="underline" disabled={sendingOtp} onClick={sendOtp}>Resend</button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                  {effectiveVerified && !editingPhone && <div className="inline-hint" style={{color:'#1aa34a'}}>Your phone number is verified.</div>}
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

              <div className="d-flex justify-content-between mt-10">
                <button className="underline" onClick={logout}>Logout</button>
                <button className="butn butn-md butn-rounded" disabled={!canSave || saving} onClick={save}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
              <div id="recaptcha-container" className="recaptcha-holder" aria-hidden="true"></div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
