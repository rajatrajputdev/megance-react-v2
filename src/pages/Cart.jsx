import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import { useEffect, useMemo, useState } from "react";
import { fetchProductById } from "../services/products";

export default function CartPage() {
  const { items, updateQty, removeItem, amount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isEmpty = items.length === 0;

  // Availability map per cart item id
  const [limits, setLimits] = useState({}); // { [cartItemId]: availableNumber|Infinity }

  // Helper to parse cart id and extract base product id and size/gender.
  const parseCartId = (id) => {
    // We append "-s<size>" and optionally "-men" or "-women" before it.
    // Safer parsing using meta if available.
    const item = items.find((x) => x.id === id);
    const size = item?.meta?.size || (id.includes("-s") ? id.split("-s").pop() : "");
    const gender = item?.meta?.gender || (/-men-?s|\-men\-s/.test(id) ? "men" : (/-women-?s|\-women\-s/.test(id) ? "women" : null));
    const baseId = (() => {
      if (!size) return id; // fallback
      const idx = id.lastIndexOf(`-s${size}`);
      if (idx === -1) return id;
      return id.slice(0, idx);
    })();
    return { baseId, size, gender };
  };

  useEffect(() => {
    let disposed = false;
    const load = async () => {
      const map = {};
      // Group items by base id to avoid duplicate fetches
      const byBase = new Map();
      for (const it of items) {
        const parsed = parseCartId(it.id);
        if (!byBase.has(parsed.baseId)) byBase.set(parsed.baseId, []);
        byBase.get(parsed.baseId).push({ it, parsed });
      }
      for (const [baseId, group] of byBase.entries()) {
        try {
          const p = await fetchProductById(baseId);
          for (const { it, parsed } of group) {
            let available = Infinity;
            if (parsed.size) {
              if (parsed.gender && Array.isArray(p?.sizeQuantities?.[parsed.gender])) {
                const row = p.sizeQuantities[parsed.gender].find((r) => String(r.size) === String(parsed.size));
                available = Number(row?.quantity) || 0;
              } else if (Array.isArray(p?.sizes) && p.sizes.length && typeof p.sizes[0] === 'object') {
                const row = p.sizes.find((r) => String(r.size) === String(parsed.size));
                available = Number(row?.quantity) || 0;
              }
            }
            map[it.id] = Number.isFinite(available) ? Math.max(0, available) : Infinity;
          }
        } catch {
          for (const { it } of group) map[it.id] = Infinity;
        }
      }
      if (!disposed) setLimits(map);
    };
    load();
    return () => { disposed = true; };
  }, [items]);

  const clamp = (id, val) => {
    const lim = limits[id];
    if (!Number.isFinite(lim)) return Math.max(1, val);
    return Math.max(1, Math.min(lim, val));
  };

  return (
    <>
      <SEO title="Your Cart" description="Review items and proceed to checkout on Megance." image="/assets/logo.svg" type="website" twitterCard="summary" />
      
      <section className="container page-section">
        <div className="row mb-40">
          <div className="col-lg-8">
            <h1 className="section-title">Your Cart</h1>
          </div>
          <div className="col-lg-4 text-lg-right mt-20 mt-lg-0">
            <Link to="/shop" className="butn butn-md butn-rounded butn-light">Continue shopping</Link>
          </div>
        </div>
      
        {isEmpty ? (
          <div className="row">
            <div className="col-12 text-center">
              <p>Your cart is empty.</p>
              <Link to="/shop" className="butn mt-10">Browse products</Link>
              <div className="mt-10">
                <Link to="/shop?price=lt3500" className="underline">See Under ₹3500</Link>
              </div>
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
                        <div className="mt-5 text-muted">₹ {it.price}</div>
                      </div>
                      <button className="remove-link" onClick={() => removeItem(it.id)}>Remove</button>
                    </div>
                    <div className="d-flex align-items-center mt-20">
                      <label className="mr-15">Quantity</label>
                      <div className="qty-control">
                        <button onClick={() => updateQty(it.id, Math.max(1, it.qty - 1))} aria-label="Decrease">-</button>
                        <input
                          type="number"
                          min={1}
                          value={clamp(it.id, it.qty)}
                          onChange={(e) => updateQty(it.id, clamp(it.id, parseInt(e.target.value || 1)))}
                        />
                        <button
                          onClick={() => updateQty(it.id, clamp(it.id, it.qty + 1))}
                          aria-label="Increase"
                          disabled={Number.isFinite(limits[it.id]) && it.qty >= limits[it.id]}
                          title={Number.isFinite(limits[it.id]) && it.qty >= limits[it.id] ? "Reached available stock" : "Increase"}
                        >
                          +
                        </button>
                      </div>
                      {Number.isFinite(limits[it.id]) && (
                        <span className="ml-10 inline-hint">Only {Math.max(0, limits[it.id] - (it.qty - 0))} left</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="col-lg-4">
              <div className="p-20 card-like summary-box">
                <h5 className="section-title">Summary</h5>
                <div className="d-flex justify-content-between mt-20">
                  <span>Subtotal</span>
                  <span>₹ {amount}</span>
                </div>
                <div className="d-flex justify-content-between mt-10">
                  <span>Shipping</span>
                  <span className="text-success">FREE</span>
                </div>
                <hr className="my-20" />
                <div className="d-flex justify-content-between fw-600">
                  <span>Total</span>
                  <span>₹ {amount}</span>
                </div>
                {user ? (
                  <Link to="/checkout" className="butn butn-md butn-rounded d-block mt-20 text-center">Proceed to Checkout</Link>
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
      <Footer />
    </>
  );
}
