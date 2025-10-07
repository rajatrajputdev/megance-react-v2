import { useCart } from "../context/CartContext.jsx";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "../services/products";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import "./shop.css";
import { useToast } from "../components/general_components/ToastProvider.jsx";

export default function Shop() {
  const { addItem } = useCart();
  const location = useLocation();
  const { showToast } = useToast();
  const [range, setRange] = useState('all');
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    let canceled = false;
    try {
      setError("");
      setLoading(true);
      const list = await fetchProducts({ visibleOnly: true });
      if (canceled) return;
      setItems(list);
    } catch (e) {
      if (canceled) return;
      setError("Failed to load products. Please try again.");
    } finally {
      if (!canceled) setLoading(false);
    }
    return () => { canceled = true; };
  };

  useEffect(() => { const c = load(); return () => { try { c?.(); } catch {} }; }, []);

  // Support price filter via query param, e.g. ?price=lt3500
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const p = sp.get('price');
    if (p && ['all','lt3500','3500to4500','gt4500'].includes(p)) {
      setRange(p);
    }
  }, [location.search]);

  const ranges = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'lt3500', label: 'Under ₹3500', test: (p) => p.price < 3500 },
    { id: '3500to4500', label: '₹3500–₹4500', test: (p) => p.price >= 3500 && p.price <= 4500 },
    { id: 'gt4500', label: 'Above ₹4500', test: (p) => p.price > 4500 },
  ];

  const gender = useMemo(() => new URLSearchParams(location.search).get('g') || 'all', [location.search]);
  const filtered = useMemo(() => {
    const byPrice = ranges.find(r => r.id === range)?.test || (() => true);
    return items
      .filter((p) => gender === 'all' ? true : (p.genders || []).includes(gender))
      .filter(byPrice);
  }, [items, range, gender]);
  return (
    <>
      <SEO title="Shop" description="Explore featured Megance products and find your perfect pair." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section shop-page nav-offset">
        <div className="row align-items-end">
          <div className="col-lg-8">
            <h1 className="section-title">Shop{gender !== 'all' ? ` — ${gender[0].toUpperCase()}${gender.slice(1)}` : ''}</h1>
            <p className="mt-10 opacity-7">Explore featured products</p>
          </div>
          <div className="col-lg-4 mt-20 d-flex justify-content-lg-end justify-content-start">
            <Link to="/cart" className="butn butn-md butn-rounded shop-cta">Go to cart</Link>
          </div>
        </div>
      </section>

      {/* (Removed) Shop by Gender cards moved to navbar */}

      {/* Product list first */}

      <section className="container page-section shop-wrap">
      <div className="row align-items-center mb-20">
        <div className="col-12">
          <div className="shop-filters">
            {ranges.map(r => (
              <button
                key={r.id}
                className={`shop-pill${range === r.id ? ' is-active' : ''}`}
                onClick={() => setRange(r.id)}
                type="button"
                aria-pressed={range === r.id}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && (
        <div className="row"><div className="col-12">
          <div className="inline-hint" role="alert" aria-live="assertive">{error}</div>
          <button className="butn mt-10" onClick={load}>Retry</button>
        </div></div>
      )}
      <div className="row">
        {loading && Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="col-sm-6 col-md-4 col-lg-3 mb-30">
            <div className="shop-card skeleton-card">
              <div className="skeleton skeleton-image" />
              <div className="shop-meta">
                <div className="skeleton skeleton-line" style={{ width: '60%' }} />
                <div className="skeleton skeleton-line" style={{ width: '30%' }} />
              </div>
              <div className="shop-actions">
                <div className="skeleton skeleton-line" />
              </div>
            </div>
          </div>
        ))}
        {!loading && filtered.map((p) => (
          <div key={p.id} className="col-sm-6 col-md-4 col-lg-3 mb-30">
            <div className="shop-card">
              <Link to={`/product/${p.id}`} className="shop-image">
                <img src={p.image} alt={p.name} />
              </Link>
              <div className="shop-meta">
                <div className="shop-name">{p.name}</div>
                <div className="shop-price">
                  ₹ {p.price}
                  {Number(p.quantity) === 0 && (
                    <span className="stock-badge oos" title="Out of stock">Out of stock</span>
                  )}
                </div>
              </div>
              <div className="shop-actions">
                <Link to={`/product/${p.id}`} className="shop-btn shop-btn--primary">View</Link>
              </div>
            </div>
          </div>
        ))}
      </div>
      </section>

      {/* Duo section: text left, image right */}
      <section className="shop-duo">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-30">
              <h2 className="section-title">Engineered For Every Step</h2>
              <p className="mt-15">From morning runs to late-night strolls, our designs balance cushioning and control so you feel supported all day.</p>
              <p className="mt-10 opacity-7">Dialed-in fit. Breathable comfort. Reliable grip for every surface.</p>
            </div>
            <div className="col-lg-6 mb-30">
              <img className="duo-img" src="/assets/imgs/works/1.jpg" alt="Product lifestyle" />
            </div>
          </div>
        </div>
      </section>

      {/* Duo section: image left, text right */}
      <section className="shop-duo">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-30 order-lg-1">
              <img className="duo-img" src="/assets/imgs/works/2.jpg" alt="City-ready shoes" />
            </div>
            <div className="col-lg-6 mb-30 order-lg-2">
              <h2 className="section-title">Built Light. Ready to Move.</h2>
              <p className="mt-15">City-ready traction meets breathable comfort. Perfect for commutes and weekend wander.</p>
              <p className="mt-10 opacity-7">Flexible uppers and locked-in stability keep you confident at pace.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fullscreen edge-to-edge image */}
      <section className="shop-hero-full" style={{backgroundImage: "url('/assets/imgs/works/3.jpg')"}} aria-label="Megance full screen visual" />

      {/* Copy block with padding */}
      <section className="container page-section shop-copy">
        <div className="row justify-content-center text-center">
          <div className="col-lg-9">
            <h3 className="section-title">Designed with Purpose</h3>
            <p className="mt-15">We obsess over the details—materials, airflow, flex patterns—so every pair works harder for you.</p>
            <p className="mt-5 opacity-7">Whether you’re training, exploring, or slowing down, your Megance stays uncompromisingly comfortable.</p>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
