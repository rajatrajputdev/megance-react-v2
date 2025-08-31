import { useState } from "react";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { openRazorpayCheckout } from "../utils/razorpay.js";
import { useNavigate, Link } from "react-router-dom";

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

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const canPay = items.length > 0 && form.email && form.name && form.phone && form.address && form.city && form.state && form.zip;

  const handlePay = async () => {
    try {
      await openRazorpayCheckout({
        amount,
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
    } catch (e) {
      alert("Failed to initiate payment: " + e.message);
    }
  };

  return (
    <section className="container pt-60 pb-60">
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
                  <input className="form-control" name="state" value={form.state} onChange={onChange} />
                </div>
                <div className="col-md-4 mb-10">
                  <label>ZIP</label>
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
              <div className="d-flex justify-content-between fw-600">
                <span>Total</span>
                <span>₹ {amount}</span>
              </div>
              <button
                disabled={!canPay}
                className="butn butn-md butn-rounded d-block mt-20 w-100"
                onClick={handlePay}
                title={!canPay ? "Fill all billing fields" : "Pay with Razorpay"}
              >
                Pay with Razorpay
              </button>
              {!import.meta.env.VITE_RAZORPAY_KEY_ID && (
                <p className="mt-10" style={{ fontSize: 12, opacity: 0.8 }}>
                  Using demo key. Set VITE_RAZORPAY_KEY_ID in .env for real test mode.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
