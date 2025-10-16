import { useMemo, useRef, useState, useEffect } from "react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { openRazorpayCheckout } from "../utils/razorpay.js";
import { useNavigate, Link } from "react-router-dom";
import { INDIAN_STATES } from "../data/indian-states.js";
import { previewCoupon } from "../services/coupons.js";
import SEO from "../components/general_components/SEO.jsx";
import ConfettiBurst from "../components/general_components/ConfettiBurst.jsx";
import "./checkout-page.css";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import { trackEvent } from "../utils/analytics.js";
import { decrementStockForItems } from "../services/inventory.js";
import { decrementStockForOrder, createRazorpayOrder, verifyRazorpaySignature } from "../services/orders.js";
const USE_CLIENT_STOCK_DECREMENT = String(import.meta.env.VITE_USE_CLIENT_STOCK || '').toLowerCase() === 'true';

export default function CheckoutPage() {
  const { items, amount, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    email: (profile?.email || user?.email) || "",
    name: (profile?.name || user?.displayName) || "",
    // Prefer profile phone; fallback to verified auth phone
    phone: (profile?.phone || user?.phoneNumber) || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zip: profile?.zip || "",
  });

  useEffect(() => {
    // Prefill only empty fields from profile/auth without overriding user's typed input
    setForm((f) => ({
      ...f,
      email: f.email || (profile?.email || user?.email) || "",
      name: f.name || (profile?.name || user?.displayName) || "",
      // Use auth phone if profile missing it (RequireProfile ensures phone is linked)
      phone: f.phone || profile?.phone || user?.phoneNumber || "",
      address: f.address || profile?.address || "",
      city: f.city || profile?.city || "",
      state: f.state || profile?.state || "",
      zip: f.zip || profile?.zip || "",
    }));
  }, [user, profile]);

  // Coupon application state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null); // { code, discount }
  const [couponError, setCouponError] = useState("");
  const discount = useMemo(() => Number(appliedCoupon?.discount || 0), [amount, appliedCoupon]);
  const netAmount = useMemo(() => Math.max(0, amount - discount), [amount, discount]);
  const gst = useMemo(() => Math.round(netAmount * 0.18), [netAmount]);
  // Payable should always include GST for accurate COD collection and display
  const payable = useMemo(() => netAmount + gst, [netAmount, gst]);

  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online"); // 'online' or 'cod'
  const [confettiKey, setConfettiKey] = useState(0);
  const [couponApplying, setCouponApplying] = useState(false);
  // If profile has address, don’t force re-entry: show summary unless user opts to edit
  const hasProfileAddress = useMemo(
    () => Boolean((profile?.address || '').trim() && profile?.city && profile?.state && profile?.zip),
    [profile]
  );
  const [showAddressEdit, setShowAddressEdit] = useState(false);
  useEffect(() => {
    // Default to summary view when profile already has an address
    setShowAddressEdit(!hasProfileAddress);
  }, [hasProfileAddress]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const addressOk = (form.address || '').trim().length >= 10;
  // Allow proceeding if phone is present either in form or in auth
  const phoneOk = Boolean((form.phone || '').trim() || (user?.phoneNumber || ''));
  const canPay = items.length > 0 && form.email && form.name && phoneOk && addressOk && form.city && form.state && form.zip;

  const createOrderDocs = async (payload) => {
    const orderRef = await addDoc(collection(db, "orders"), payload);
    if (user?.uid) {
      try {
        await addDoc(collection(db, "users", user.uid, "orders"), { ...payload, orderId: orderRef.id });
      } catch {}
    }
    return orderRef.id;
  };

  const handlePay = async (methodOverride) => {
    const chosen = methodOverride || paymentMethod;
    if (chosen !== paymentMethod) setPaymentMethod(chosen);
    // COD path
    if (chosen === "cod") {
      try {
        setPaying(true);
        const payload = {
          userId: user?.uid || null,
          items: items.map(({ id, name, price, qty, meta }) => ({ id, name, price, qty, meta: meta || null })),
          amount,
          discount,
          gst,
          couponCode: appliedCoupon?.code || null,
          payable,
          status: "ordered",
          paymentMethod: "cod",
          paymentId: "COD",
          billing: {
            name: form.name,
            email: form.email,
            // Persist a reliable phone even if user didn’t type it again
            phone: form.phone || user?.phoneNumber || "",
            address: form.address,
            city: form.city,
            state: form.state,
            zip: form.zip,
          },
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };
        const oid = await createOrderDocs(payload);
        // Ensure server-side stock decrement (idempotent)
        try { await decrementStockForOrder(oid); } catch {}
        // Track purchase (COD)
        try {
          trackEvent('purchase', {
            currency: 'INR',
            value: payable,
            transaction_id: oid,
            payment_type: 'cod',
            items: items.map(({ id, name, price, qty }) => ({ item_id: id, item_name: name, price, quantity: qty })),
          });
        } catch {}
        clearCart();
        showToast("success", "Order placed with Cash on Delivery");
        setPaying(false);
        navigate(`/order-success?oid=${oid}`);
        return;
      } catch (e) {
        showToast("error", e?.message || "Failed to place COD order");
        setPaying(false);
        return;
      }
    }

    // Online path (Razorpay)
    try {
      setPaying(true);
      // 1) Create server-side Razorpay order
      // Short receipt (Razorpay requires <= 40 chars)
      const receipt = `r-${Date.now().toString(36)}-${(user?.uid || 'anon').slice(0,8)}`;
      const { order, keyId } = await createRazorpayOrder({ amount: payable, receipt });

      // 2) Open checkout with server-provided key + order_id
      await openRazorpayCheckout({
        key: keyId,
        orderId: order?.id,
        amount: payable,
        name: "Megance",
        description: `Payment for ${items.length} item(s)`,
        prefill: { name: form.name, email: form.email, contact: form.phone || user?.phoneNumber || "" },
        notes: { address: `${form.address}, ${form.city}, ${form.state} ${form.zip}` },
        onSuccess: async (resp) => {
          try {
            // 3) Create order doc first (status: ordered)
            const payload = {
              userId: user?.uid || null,
              items: items.map(({ id, name, price, qty, meta }) => ({ id, name, price, qty, meta: meta || null })),
              amount,
              discount,
              gst,
              couponCode: appliedCoupon?.code || null,
              payable,
              status: "ordered",
              paymentMethod: "online",
              paymentId: resp?.razorpay_payment_id || "",
              billing: {
                name: form.name,
                email: form.email,
                // Persist a reliable phone even if user didn’t type it again
                phone: form.phone || user?.phoneNumber || "",
                address: form.address,
                city: form.city,
                state: form.state,
                zip: form.zip,
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            };
            const oid = await createOrderDocs(payload);

            // 4) Verify signature (marks as paid + triggers WhatsApp server-side)
            try {
              await verifyRazorpaySignature({
                razorpay_order_id: resp?.razorpay_order_id || order?.id,
                razorpay_payment_id: resp?.razorpay_payment_id,
                razorpay_signature: resp?.razorpay_signature,
                orderDocId: oid,
              });
            } catch (err) {
              console.warn('[checkout] signature verify failed', err?.message || err);
            }

            // 5) Ensure server-side stock decrement (idempotent)
            try { await decrementStockForOrder(oid); } catch {}

            // Track purchase
            try {
              trackEvent('purchase', {
                currency: 'INR',
                value: payable,
                transaction_id: oid,
                payment_type: 'online',
                items: items.map(({ id, name, price, qty }) => ({ item_id: id, item_name: name, price, quantity: qty })),
              });
            } catch {}
            clearCart();
            setPaying(false);
            navigate(`/order-success?oid=${oid}&pid=${encodeURIComponent(resp?.razorpay_payment_id || "")}`);
          } catch (_) {
            // Fallback navigation if Firestore write fails
            clearCart();
            setPaying(false);
            navigate(`/order-success?pid=${encodeURIComponent(resp?.razorpay_payment_id || "")}`);
          }
        },
        onDismiss: () => {
          setPaying(false);
          try { showToast("info", "Payment canceled"); } catch {}
        },
      });
      showToast("info", "Opening Razorpay checkout…");
    } catch (e) {
      showToast("error", e?.message || "Payment initiation failed. Please try again.");
      setPaying(false);
    }
  };

  const applyCoupon = async () => {
    try {
      setCouponApplying(true);
      setCouponError("");
      const res = await previewCoupon({ code: couponInput, amount });
      if (!res?.ok) {
        const reason = res?.reason || 'Invalid coupon code';
        const msg = (
          reason === 'amount_not_eligible' ? 'Not eligible for this account' :
          reason === 'max_uses_reached' ? 'Coupon usage limit reached' :
          reason === 'user_limit_reached' ? 'You have already used this coupon' :
          reason === 'inactive' ? 'Coupon expired or inactive' : 'Invalid coupon code'
        );
        setCouponError(msg);
        showToast("error", msg);
        return;
      }
      setAppliedCoupon({ code: res.code, discount: res.discount });
      setCouponError("");
      showToast("success", `Coupon ${res.code} applied`);
      setConfettiKey((k) => k + 1);
    } catch (_) {
      const msg = "Could not apply coupon. Try again.";
      setCouponError(msg);
      showToast("error", msg);
    } finally {
      setCouponApplying(false);
    }
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError("");
    showToast("info", "Coupon removed");
  };

  return (
    <>
    <SEO title="Checkout" description="Complete your Megance order securely with Razorpay." image="/assets/logo.svg" type="website" twitterCard="summary" />
    <section className="container pt-60 pb-60 checkout-page white-navbar-page">
      <ConfettiBurst triggerKey={confettiKey} />
      {/* Toasts handled by global ToastProvider */}
      <div className="row mb-20 mt-20">
        <div className="col-12 d-flex justify-content-between align-items-center">
          <h2>Checkout</h2>
          {!user && <Link to="/login" className="underline">Login</Link>}
        </div>
      </div>

      {items.length === 0 ? (
        <div className="row">
          <div className="col-12 text-center">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="butn mt-10">Go to Shop</Link>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-lg-7 mb-20">
            <div className="p-20 card-like glass-surface strong-elevation">
              <h5>Billing Details</h5>
              <div className="row mt-10">
                <div className="col-md-6 mb-10">
                  <label>Name</label>
                  <input className="form-control" name="name" value={form.name} onChange={onChange} aria-invalid={!form.name} />
                  {!form.name && !canPay && <div className="inline-error">Name is required</div>}
                </div>
                <div className="col-md-6 mb-10">
                  <label>Email</label>
                  <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} aria-invalid={!form.email} />
                  {!form.email && !canPay && <div className="inline-error">Email is required</div>}
                </div>
                <div className="col-md-6 mb-10">
                  <label>Phone</label>
                  <input className="form-control" name="phone" value={form.phone} onChange={onChange} inputMode="tel" aria-invalid={!phoneOk} />
                  {!phoneOk && !canPay && <div className="inline-error">Phone is required</div>}
                </div>
                {(!showAddressEdit && hasProfileAddress) ? (
                  <div className="col-12 mb-10">
                    <label>Delivery Address</label>
                    <div className="glass-surface p-15" style={{borderRadius: 10, border: '1px solid rgba(0,0,0,0.08)'}}>
                      <div className="fw-600">{form.name}</div>
                      <div className="opacity-7" style={{marginTop: 2}}>{form.phone || user?.phoneNumber || ''}</div>
                      <div style={{marginTop: 6}}>
                        <div>{form.address}</div>
                        <div>{[form.city, form.state, form.zip].filter(Boolean).join(', ')}</div>
                      </div>
                      <div className="mt-8 d-flex justify-content-end">
                        <button type="button" className="underline" onClick={() => setShowAddressEdit(true)}>Edit address</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="col-12 mb-10">
                      <label>Address</label>
                      <input className="form-control" name="address" value={form.address} onChange={onChange} aria-invalid={!addressOk} minLength={10} />
                      {!addressOk && (
                        <div className="inline-error">Please enter at least 10 characters for the address</div>
                      )}
                    </div>
                    <div className="col-md-4 mb-10">
                      <label>City</label>
                      <input className="form-control" name="city" value={form.city} onChange={onChange} aria-invalid={!form.city} />
                      {!form.city && !canPay && <div className="inline-error">City is required</div>}
                    </div>
                    <div className="col-md-4 mb-10">
                      <label>State</label>
                      <select className="form-control" name="state" value={form.state} onChange={onChange} aria-invalid={!form.state}>
                        <option value="">Select State/UT</option>
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {!form.state && !canPay && <div className="inline-error">State is required</div>}
                    </div>
                    <div className="col-md-4 mb-10">
                      <label>PIN Code</label>
                      <input className="form-control" name="zip" value={form.zip} onChange={onChange} aria-invalid={!form.zip} />
                      {!form.zip && !canPay && <div className="inline-error">PIN code is required</div>}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="p-20 card-like summary-box glass-surface strong-elevation">
              <h5>Order Summary</h5>
              <ul className="mt-10 summary-items">
                {items.map((x) => (
                  <li key={x.id} className="d-flex justify-content-between mb-5">
                    <span>
                      {x.name} × {x.qty}
                    </span>
                    <span>₹ {x.price * x.qty}</span>
                  </li>
                ))}
              </ul>
              <hr />
              <div className="mb-10">
                {!appliedCoupon ? (
                  <div className="coupon-row">
                    <input
                      className="form-control"
                      placeholder="Coupon code"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value)}
                    />
                    <button
                      className="butn butn-md butn-rounded glow-primary coupon-apply-btn"
                      onClick={applyCoupon}
                      disabled={couponApplying || !couponInput}
                      title={couponApplying ? 'Applying…' : (!couponInput ? 'Enter a coupon code' : 'Apply coupon')}
                    >
                      {couponApplying ? 'Applying…' : 'Apply'}
                    </button>
                    {couponError && <div className="inline-error" style={{marginTop:8}}>{couponError}</div>}
                  </div>
                ) : (
                  <div className="d-flex justify-content-between align-items-center coupon-applied-row">
                    <div className="coupon-success">
                      <span className="chk" aria-hidden="true"></span>
                      <span className="coupon-success-text">Applied {appliedCoupon.code}</span>
                    </div>
                    <button className="coupon-remove-btn" onClick={removeCoupon}>
                      Remove
                    </button>
                  </div>
                )}
              </div>
              <div className="mb-10">
                <label className="label-sm">Payment Method</label>
                <div className="pay-methods mt-6" role="group" aria-label="Payment Method">
                  <button
                    type="button"
                    className="pay-method-btn"
                    onClick={() => handlePay('online')}
                    disabled={paying || !canPay}
                    title={!canPay ? 'Fill all billing fields' : 'Pay securely with Razorpay'}
                  >
                    <span className="pm-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M7 17L17 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M14 6H18V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" strokeWidth="2" opacity="0.45"/>
                      </svg>
                    </span>
                    <span>Pay with Razorpay</span>
                  </button>
                  <button
                    type="button"
                    className="pay-method-btn"
                    onClick={() => handlePay('cod')}
                    disabled={paying || !canPay}
                    title={!canPay ? 'Fill all billing fields' : 'Place order with Cash on Delivery'}
                  >
                    <span className="pm-icon" aria-hidden="true">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="2" y="6" width="20" height="12" rx="2" stroke="currentColor" strokeWidth="2"/>
                        <circle cx="8" cy="12" r="2.5" stroke="currentColor" strokeWidth="2"/>
                        <path d="M14 12h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M6 3h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.5"/>
                      </svg>
                    </span>
                    <span>Cash on Delivery</span>
                  </button>
                </div>
              </div>
              <div className="d-flex justify-content-between fw-600">
                <span>Subtotal</span>
                <span>₹ {amount}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between" style={{ color: '#1aa34a' }}>
                  <span>Discount</span>
                  <span>- ₹ {discount}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fw-600 mt-10">
                <span>Payable (incl. GST)</span>
                <span>₹ {payable}</span>
              </div>
              {!canPay && (
                <p className="inline-hint">Fill all billing details to proceed</p>
              )}
              <p className="inline-hint mt-6">Prices are inclusive of GST.</p>
              <p className="inline-hint mt-6">Disclaimer</p>
              <p className="inline-hint mt-6">There is no Exchange Policy </p>
              <p className="inline-hint mt-6">In case of Returns, Handling fees of ₹450 will be non-refundable to users </p>
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  );
}
