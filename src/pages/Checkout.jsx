import { useMemo, useRef, useState, useEffect } from "react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { openRazorpayCheckout } from "../utils/razorpay.js";
import { useNavigate, Link } from "react-router-dom";
import { INDIAN_STATES } from "../data/indian-states.js";
import { findCoupon, computeDiscount } from "../data/coupons.js";
import SEO from "../components/general_components/SEO.jsx";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase.js";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import { trackEvent } from "../utils/analytics.js";
import { decrementStockForItems } from "../services/inventory.js";
import { decrementStockForOrder } from "../services/orders.js";
const USE_CLIENT_STOCK_DECREMENT = String(import.meta.env.VITE_USE_CLIENT_STOCK || '').toLowerCase() === 'true';

export default function CheckoutPage() {
  const { items, amount, clearCart } = useCart();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [form, setForm] = useState({
    email: (profile?.email || user?.email) || "",
    name: (profile?.name || user?.displayName) || "",
    phone: profile?.phone || "",
    address: profile?.address || "",
    city: profile?.city || "",
    state: profile?.state || "",
    zip: profile?.zip || "",
  });

  useEffect(() => {
    setForm((f) => ({
      ...f,
      email: (profile?.email || user?.email) || f.email,
      name: (profile?.name || user?.displayName) || f.name,
      phone: profile?.phone || f.phone,
      address: profile?.address || f.address,
      city: profile?.city || f.city,
      state: profile?.state || f.state,
      zip: profile?.zip || f.zip,
    }));
  }, [user, profile]);

  // Coupon application state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponError, setCouponError] = useState("");
  const discount = useMemo(() => computeDiscount({ amount, coupon: appliedCoupon }), [amount, appliedCoupon]);
  const payable = Math.max(0, amount - discount);

  const [paying, setPaying] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("online"); // 'online' or 'cod'

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const canPay = items.length > 0 && form.email && form.name && form.phone && form.address && form.city && form.state && form.zip;

  const createOrderDocs = async (payload) => {
    const orderRef = await addDoc(collection(db, "orders"), payload);
    if (user?.uid) {
      try {
        await addDoc(collection(db, "users", user.uid, "orders"), { ...payload, orderId: orderRef.id });
      } catch {}
    }
    return orderRef.id;
  };

  const handlePay = async () => {
    // COD path
    if (paymentMethod === "cod") {
      try {
        setPaying(true);
        const payload = {
          userId: user?.uid || null,
          items: items.map(({ id, name, price, qty, meta }) => ({ id, name, price, qty, meta: meta || null })),
          amount,
          discount,
          payable,
          status: "ordered",
          paymentMethod: "cod",
          paymentId: "COD",
          billing: {
            name: form.name,
            email: form.email,
            phone: form.phone,
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
      await openRazorpayCheckout({
        amount: payable,
        name: "Megance",
        description: `Payment for ${items.length} item(s)`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { address: `${form.address}, ${form.city}, ${form.state} ${form.zip}` },
        onSuccess: async (resp) => {
          try {
            const payload = {
              userId: user?.uid || null,
              items: items.map(({ id, name, price, qty, meta }) => ({ id, name, price, qty, meta: meta || null })),
              amount,
              discount,
              payable,
              status: "ordered",
              paymentId: resp?.razorpay_payment_id || "test_payment",
              billing: {
                name: form.name,
                email: form.email,
                phone: form.phone,
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
            navigate(`/order-success?oid=${oid}&pid=${encodeURIComponent(resp.razorpay_payment_id || "test_payment")}`);
          } catch (_) {
            // Fallback navigation if Firestore write fails
            clearCart();
            setPaying(false);
            navigate(`/order-success?pid=${encodeURIComponent(resp.razorpay_payment_id || "test_payment")}`);
          }
        },
        onDismiss: () => {
          // just return to checkout
          setPaying(false);
          try { showToast("info", "Payment canceled"); } catch {}
        },
      });
      showToast("info", "Opening Razorpay checkout…");
    } catch (e) {
      showToast("error", "Payment initiation failed. Please try again.");
      setPaying(false);
    }
  };

  const applyCoupon = () => {
    const c = findCoupon(couponInput);
    if (!c) {
      const msg = "Invalid coupon code";
      setCouponError(msg);
      showToast("error", msg);
      return;
    }
    if (c.minAmount && amount < c.minAmount) {
      const msg = `Valid on minimum order of ₹${c.minAmount}`;
      setCouponError(msg);
      showToast("error", msg);
      return;
    }
    setAppliedCoupon(c);
    setCouponError("");
    showToast("success", `Coupon ${c.code} applied`);
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
      {/* Toasts handled by global ToastProvider */}
      <div className="row mb-20">
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
            <div className="p-20 card-like">
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
                  <input className="form-control" name="phone" value={form.phone} onChange={onChange} inputMode="tel" aria-invalid={!form.phone} />
                  {!form.phone && !canPay && <div className="inline-error">Phone is required</div>}
                </div>
                <div className="col-12 mb-10">
                  <label>Address</label>
                  <input className="form-control" name="address" value={form.address} onChange={onChange} aria-invalid={!form.address} />
                  {!form.address && !canPay && <div className="inline-error">Address is required</div>}
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
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="p-20 card-like summary-box">
              <h5>Order Summary</h5>
              <ul className="mt-10">
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
                    <button className="butn butn-md butn-rounded" onClick={applyCoupon}>Apply</button>
                    {couponError && <div className="inline-error" style={{marginTop:8}}>{couponError}</div>}
                  </div>
                ) : (
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="coupon-success">
                      <span className="chk"></span>
                      <span>Applied {appliedCoupon.code}</span>
                    </div>
                    <button className="underline" onClick={removeCoupon}>Remove</button>
                  </div>
                )}
              </div>
              <div className="mb-10">
                <label className="label-sm">Payment Method</label>
                <div className="d-flex gap-10 mt-6" role="radiogroup" aria-label="Payment Method">
                  <label style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <input type="radio" name="pm" value="online" checked={paymentMethod==='online'} onChange={()=>setPaymentMethod('online')} />
                    <span>Online (Razorpay)</span>
                  </label>
                  <label style={{display:'inline-flex',alignItems:'center',gap:6}}>
                    <input type="radio" name="pm" value="cod" checked={paymentMethod==='cod'} onChange={()=>setPaymentMethod('cod')} />
                    <span>Cash on Delivery</span>
                  </label>
                </div>
              </div>
              <div className="d-flex justify-content-between fw-600">
                <span>Total</span>
                <span>₹ {amount}</span>
              </div>
              {discount > 0 && (
                <div className="d-flex justify-content-between" style={{ color: '#1aa34a' }}>
                  <span>Discount</span>
                  <span>- ₹ {discount}</span>
                </div>
              )}
              <div className="d-flex justify-content-between fw-600 mt-10">
                <span>Payable</span>
                <span>₹ {payable}</span>
              </div>
              <button
                disabled={!canPay || paying}
                className="butn butn-md butn-rounded d-block mt-20 w-100"
                onClick={handlePay}
                title={!canPay ? "Fill all billing fields" : (paying ? "Processing…" : (paymentMethod==='cod' ? 'Place Order (COD)' : 'Pay with Razorpay'))}
              >
                {paying ? "Processing…" : (paymentMethod === 'cod' ? 'Place Order' : 'Pay with Razorpay')}
              </button>
              {!canPay && (
                <p className="inline-hint">Fill all billing details to proceed</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
    </>
  );
}
