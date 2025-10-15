import { useEffect, useRef, useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase.js";
import { updateUserProfileServer } from "../services/profile.js";
import SEO from "../components/general_components/SEO.jsx";
import "./account-page.css";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import { INDIAN_STATES } from "../data/indian-states.js";
import { friendlyOtpError } from "../utils/errors.js";

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
  const { showToast } = useToast();
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [otpInfo, setOtpInfo] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const otpBlockRef = useRef(null);
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    // Prefer subcollection under user; avoids composite index needs
    const q = query(collection(db, "users", user.uid, "orders"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      // Fallback sort if timestamps are null
      list.sort((a,b)=>((b.createdAt?.toMillis?.()||0)-(a.createdAt?.toMillis?.()||0)));
      setOrders(list);
      setOrdersLoading(false);
    }, () => setOrdersLoading(false));
    return () => unsub();
  }, [user]);

  useEffect(() => {
    setForm((f) => ({
      ...f,
      name: (profile?.name || user?.displayName) || "",
      email: (profile?.email || user?.email) || "",
      // Prefer auth phoneNumber if recently changed, else profile phone
      phone: (user?.phoneNumber || profile?.phone) || "",
      address: profile?.address || "",
      city: profile?.city || "",
      state: profile?.state || "",
      zip: profile?.zip || "",
    }));
  }, [user, profile]);

  // No cooldown timers

  // Toasts handled globally

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const hasLinkedPhone = Boolean(user?.phoneNumber);
  const baseVerified = hasLinkedPhone || profile?.phoneVerified === true;
  const effectiveVerified = (baseVerified && !editingPhone) || otpVerified === true;
  const addressOk = (form.address || '').trim().length >= 10;
  const canSave = !!form.name && !!form.email && !!form.phone && addressOk && !!form.city && !!form.state && !!form.zip && (!editingPhone || otpVerified === true);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserProfileServer({
        name: form.name,
        email: form.email,
        address: form.address,
        city: form.city,
        state: form.state,
        zip: form.zip,
      });
      showToast("success", "Profile saved");
    } catch (e) {
      showToast("error", e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // No cooldown logic

  const sendOtp = async () => {
    setSendingOtp(true);
    try {
      setOtpError(""); setOtpInfo("");
      if (editingPhone || baseVerified) await startChangePhone(form.phone);
      else await startLinkPhone(form.phone);
      setOtpCode("");
      setOtpSent(true);
      setOtpInfo("OTP sent to your phone");
      showToast("info", "OTP sent to your phone");
    } catch (e) {
      try { console.error('[OTP][send] error', e?.code || e, e); } catch {}
      const msg = friendlyOtpError(e, 'send');
      setOtpError(msg);
      showToast("error", msg);
      try { otpBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
    } finally {
      setSendingOtp(false);
    }
  };

  const verifyOtp = async () => {
    setVerifyingOtp(true);
    try {
      setOtpError(""); setOtpInfo("");
      let u;
      if (editingPhone || baseVerified) u = await confirmChangePhone(otpCode);
      else u = await confirmLinkPhone(otpCode);
      setOtpVerified(true);
      setEditingPhone(false);
      try { if (u?.phoneNumber) setForm((f) => ({ ...f, phone: u.phoneNumber })); } catch {}
      setOtpInfo("Phone verified");
      showToast("success", "Phone verified");
    } catch (e) {
      try { console.error('[OTP][verify] error', e?.code || e, e); } catch {}
      const msg = friendlyOtpError(e, 'verify');
      setOtpError(msg);
      showToast("error", msg);
      setOtpCode("");
      try { otpBlockRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {}
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
      <SEO title="Account" description="Manage your Megance account." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section white-navbar-page account-page">
        {/* Toasts handled by global provider */}

        <div className="row">
          <div className="col-lg-7">
            <div className="p-20 card-like glass-surface strong-elevation account-card">
              <h3 className="mb-10">Your Account</h3>
              <p className="opacity-7">Update your profile information and contact details.</p>
              <div className="row mt-10">
                <div className="col-md-6 mb-10">
                  <label>Name</label>
                  <input className="form-control" name="name" value={form.name} onChange={onChange} aria-invalid={!form.name} />
                  {!form.name && !canSave && <div className="inline-error">Name is required</div>}
                </div>
                <div className="col-md-6 mb-10">
                  <label>Email</label>
                  <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} aria-invalid={!form.email} />
                  {!form.email && !canSave && <div className="inline-error">Email is required</div>}
                </div>
                <div className="col-md-6 mb-10">
                  <label>Phone</label>
                  <input
                    className="form-control"
                    name="phone"
                    value={form.phone}
                    onChange={onChange}
                    disabled={effectiveVerified && !editingPhone}
                    inputMode="tel"
                    pattern="^\\+?\\d{10,15}$"
                    title="Enter 10–15 digits, optionally starting with +"
                    aria-invalid={!effectiveVerified && !form.phone}
                  />
                  {!effectiveVerified && !form.phone && !canSave && <div className="inline-error">Phone is required</div>}
                  {effectiveVerified && !editingPhone && (
                    <div className="phone-verified-row">
                      <button
                        type="button"
                        className="account-secondary-btn account-secondary-btn--sm"
                        onClick={() => { setEditingPhone(true); setOtpSent(false); setOtpCode(""); setOtpVerified(false); }}
                      >
                        Change
                      </button>
                    </div>
                  )}
                  {(!effectiveVerified || editingPhone) && (
                    <div className="otp-section mt-6" ref={otpBlockRef}>
                      {!otpSent ? (
                        <>
                          <div className="form-hint">We’ll send a one-time code to verify this number.</div>
                          <button type="button" className="butn butn-sm butn-rounded mt-6" disabled={sendingOtp} onClick={sendOtp}>
                            {sendingOtp ? "Sending…" : "Send OTP"}
                          </button>
                          {otpInfo && <div className="alert info mt-6" role="status" aria-live="polite">{otpInfo}</div>}
                          {otpError && <div className="alert error mt-6" role="alert" aria-live="assertive">{otpError}</div>}
                        </>
                      ) : (
                        <>
                          <label className="mt-4">Enter OTP Code</label>
                          <div className="otp-inline mt-4">
                            <input className="form-control otp-code-input" placeholder="6-digit code" inputMode="numeric" pattern="[0-9]*" maxLength={6} value={otpCode} onChange={onOtpInput} />
                            <button type="button" className="butn butn-sm butn-rounded" disabled={verifyingOtp} onClick={verifyOtp}>{verifyingOtp ? "Verifying…" : "Verify OTP"}</button>
                            <button type="button" className="account-secondary-btn account-secondary-btn--sm" disabled={sendingOtp} onClick={sendOtp}>Resend</button>
                          </div>
                          {otpInfo && <div className="alert info mt-6" role="status" aria-live="polite">{otpInfo}</div>}
                          {otpError && <div className="alert error mt-6" role="alert" aria-live="assertive">{otpError}</div>}
                        </>
                      )}
                    </div>
                  )}
                  {effectiveVerified && !editingPhone && <div className="inline-hint" style={{color:'#1aa34a'}}>Your phone number is verified.</div>}
                </div>
                <div className="col-12 mb-10">
                  <label>Street Address</label>
                  <input className="form-control" name="address" value={form.address} onChange={onChange} aria-invalid={!addressOk} minLength={10} />
                  {!addressOk && <div className="inline-error">Please enter at least 10 characters</div>}
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

              <div className="d-flex justify-content-between mt-10">
                <button className="account-secondary-btn" onClick={logout}>Logout</button>
                <button className="butn butn-md butn-rounded account-primary-btn" disabled={!canSave || saving} onClick={save}>
                  {saving ? "Saving…" : "Save Changes"}
                </button>
              </div>
              {/* Recaptcha host is mounted globally; no per-page container needed */}
            </div>
          </div>
          <div className="col-lg-5 mt-20 mt-lg-0">
            <div className="p-20 card-like glass-surface strong-elevation orders-card">
              <h4 className="mb-10">Your Orders</h4>
              {ordersLoading ? (
                <p className="opacity-7">Loading orders…</p>
              ) : orders.length === 0 ? (
                <p className="opacity-7">No orders yet.</p>
              ) : (
                <ul className="orders-list mt-10">
                  {orders.map((o) => (
                    <li key={o.id} className="order-item glass-surface">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="fw-600">Order #{(o.orderId || o.id).slice(0,6).toUpperCase()}</div>
                          <div className="opacity-7 small">{o.createdAt?.toDate ? o.createdAt.toDate().toLocaleString() : ""}</div>
                          <div className="small mt-4">Items: {Array.isArray(o.items) ? o.items.reduce((a,b)=>a + (b.qty||0),0) : 0}</div>
                        </div>
                        <div className="text-right">
                          <div className="fw-600">₹ {o.payable}</div>
                          <div className="mt-4"></div>
                          <div className="mt-6">
                            <a className="account-secondary-btn account-secondary-btn--sm" href={`/account/orders/${o.id}`}>View</a>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
