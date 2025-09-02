import { useMemo, useRef, useState, useEffect } from "react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { openRazorpayCheckout } from "../utils/razorpay.js";
import { useNavigate, Link } from "react-router-dom";
import { INDIAN_STATES } from "../data/indian-states.js";
import { findCoupon, computeDiscount } from "../data/coupons.js";

export default function CheckoutPage() {
  const { items, amount, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: user?.email || "",
    name: user?.name || "",
    phone: "",
    address: "",
    city: "",
    state: "",
    zip: "",
  });

  // Coupon application state
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const discount = useMemo(() => computeDiscount({ amount, coupon: appliedCoupon }), [amount, appliedCoupon]);
  const payable = Math.max(0, amount - discount);

  // Toast messages (no window.alert)
  const [toast, setToast] = useState(null); // { type: 'error'|'success'|'info', text: string }
  const toastTimer = useRef(null);
  const showToast = (type, text) => {
    setToast({ type, text });
  };
  useEffect(() => {
    if (!toast) return;
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toast]);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const canPay = items.length > 0 && form.email && form.name && form.phone && form.address && form.city && form.state && form.zip;

  const handlePay = async () => {
    try {
      await openRazorpayCheckout({
        amount: payable,
        name: "Megance",
        description: `Payment for ${items.length} item(s)`,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        notes: { address: `${form.address}, ${form.city}, ${form.state} ${form.zip}` },
        onSuccess: (resp) => {
          clearCart();
          navigate(`/order-success?pid=${encodeURIComponent(resp.razorpay_payment_id || "test_payment")}`);
        },
        onDismiss: () => {
          // just return to checkout
        },
      });
      showToast("info", "Opening Razorpay checkout…");
    } catch (e) {
      showToast("error", "Payment initiation failed. Please try again.");
    }
  };

  const applyCoupon = () => {
    const c = findCoupon(couponInput);
    if (!c) {
      showToast("error", "Invalid coupon code");
      return;
    }
    if (c.minAmount && amount < c.minAmount) {
      showToast("error", `Valid on minimum order of ₹${c.minAmount}`);
      return;
    }
    setAppliedCoupon(c);
    showToast("success", `Coupon ${c.code} applied`);
  };

  const removeCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    showToast("info", "Coupon removed");
  };

  return (
    <section className="container pt-60 pb-60 checkout-page">
      {toast && (
        <div className="toast-container">
          <div className={`alert-toast ${toast.type}`}>
            <span className="dot" />
            <span>{toast.text}</span>
          </div>
        </div>
      )}
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
                  <input className="form-control" name="name" value={form.name} onChange={onChange} />
                </div>
                <div className="col-md-6 mb-10">
                  <label>Email</label>
                  <input className="form-control" name="email" type="email" value={form.email} onChange={onChange} />
                </div>
                <div className="col-md-6 mb-10">
                  <label>Phone</label>
                  <input className="form-control" name="phone" value={form.phone} onChange={onChange} />
                </div>
                <div className="col-12 mb-10">
                  <label>Address</label>
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
                disabled={!canPay}
                className="butn butn-md butn-rounded d-block mt-20 w-100"
                onClick={handlePay}
                title={!canPay ? "Fill all billing fields" : "Pay with Razorpay"}
              >
                Pay with Razorpay
              </button>
              {!canPay && (
                <p className="inline-hint">Fill all billing details to proceed</p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
