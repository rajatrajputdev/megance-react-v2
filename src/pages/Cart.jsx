import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SEO from "../components/general_components/SEO.jsx";

export default function CartPage() {
  const { items, updateQty, removeItem, amount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEmpty = items.length === 0;

  return (
    <>
      <SEO title="Your Cart" description="Review items and proceed to checkout on Megance." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="page-hero">
        <div className="container">
          <div className="row align-items-end">
            <div className="col-lg-8">
              <h1 className="title">Your Cart</h1>
              <p className="mt-10">Review items and proceed to checkout.</p>
            </div>
            <div className="col-lg-4 text-lg-right mt-20">
              <Link to="/shop" className="butn butn-md butn-rounded">Continue shopping</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="container page-section">
      
      {isEmpty ? (
        <div className="row">
          <div className="col-12 text-center">
            <p>Your cart is empty.</p>
            <Link to="/shop" className="butn mt-10">Browse products</Link>
          </div>
        </div>
      ) : (
        <div className="row">
          <div className="col-lg-8">
            {items.map((it) => (
              <div key={it.id} className="cart-item mb-20">
                <div className="thumb">
                  <img src={it.image} alt={it.name} />
                </div>
                <div className="flex-fill">
                  <div className="d-flex justify-content-between">
                    <div>
                      <div className="fw-600">{it.name}</div>
                      <div className="mt-5">₹ {it.price}</div>
                    </div>
                    <button className="underline remove-link" onClick={() => removeItem(it.id)}>Remove</button>
                  </div>
                  <div className="d-flex align-items-center mt-10">
                    <label className="mr-10">Qty</label>
                    <div className="qty-control">
                      <button onClick={() => updateQty(it.id, it.qty - 1)} aria-label="Decrease">-</button>
                      <input
                        type="number"
                        min={1}
                        value={it.qty}
                        onChange={(e) => updateQty(it.id, Math.max(1, parseInt(e.target.value || 1)))}
                      />
                      <button onClick={() => updateQty(it.id, it.qty + 1)} aria-label="Increase">+</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="col-lg-4">
            <div className="p-20 card-like summary-box">
              <h5>Summary</h5>
              <div className="d-flex justify-content-between mt-10">
                <span>Subtotal</span>
                <span>₹ {amount}</span>
              </div>
              <div className="d-flex justify-content-between mt-5">
                <span>Shipping</span>
                <span>₹ 0</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between fw-600">
                <span>Total</span>
                <span>₹ {amount}</span>
              </div>
              {user ? (
                <Link to="/checkout" className="butn butn-md butn-rounded d-block mt-20 text-center">Checkout</Link>
              ) : (
                <button
                  className="butn butn-md butn-rounded d-block mt-20 w-100"
                  onClick={() => navigate("/login?from=/checkout")}
                >
                  Login to Checkout
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </section>
    </>
  );
}
