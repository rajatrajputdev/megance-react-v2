import { products } from "../data/products.js";
import { useCart } from "../context/CartContext.jsx";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function Shop() {
  const { addItem } = useCart();
  const [range, setRange] = useState('all');

  const ranges = [
    { id: 'all', label: 'All', test: () => true },
    { id: 'lt3500', label: 'Under ₹3500', test: (p) => p.price < 3500 },
    { id: '3500to4500', label: '₹3500–₹4500', test: (p) => p.price >= 3500 && p.price <= 4500 },
    { id: 'gt4500', label: 'Above ₹4500', test: (p) => p.price > 4500 },
  ];

  const items = useMemo(() => products.filter((p) => (ranges.find(r => r.id === range)?.test || (()=>true))(p)), [range]);
  return (
    <>
      <SEO title="Shop" description="Explore featured Megance products and find your perfect pair." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section className="container page-section shop-page">
        <div className="row align-items-end">
          <div className="col-lg-8">
            <h1 className="section-title">Shop</h1>
            <p className="mt-10 opacity-7">Explore featured products</p>
          </div>
          <div className="col-lg-4 mt-20 d-flex justify-content-lg-end justify-content-start">
            <Link to="/cart" className="butn butn-md butn-rounded shop-cta">Go to cart</Link>
          </div>
        </div>
      </section>

      <section className="container page-section">
      <div className="row align-items-center mb-20">
        <div className="col-12">
          <div className="filter-pills">
            {ranges.map(r => (
              <button
                key={r.id}
                className={`pill${range === r.id ? ' active' : ''}`}
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
      <div className="row">
        {items.map((p) => (
          <div key={p.id} className="col-sm-6 col-md-4 col-lg-3 mb-30">
            <div className="product-card p-15">
              <Link to={`/product/${p.id}`} className="d-block mb-10">
                <img src={p.image} alt={p.name} className="img-fluid" />
              </Link>
              <div className="product-details">
                <div className="name">{p.name}</div>
                <div className="price">₹ {p.price}</div>
              </div>
              <div className="d-flex mt-10">
                <Link to={`/product/${p.id}`} className="butn butn-md butn-rounded mr-10">View</Link>
                <button className="butn butn-md butn-rounded" onClick={() => addItem(p, 1)}>Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>
      </section>
      <Footer />
    </>
  );
}
