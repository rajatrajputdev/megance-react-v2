import { useParams, Link } from "react-router-dom";
import { getProductById } from "../data/products.js";
import { useCart } from "../context/CartContext.jsx";
import { useMemo, useRef, useState } from "react";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";

export default function ProductPage() {
  const { id } = useParams();
  const product = getProductById(id);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [size, setSize] = useState("");
  const [tab, setTab] = useState("desc"); // desc | specs | reviews

  const sizes = ["6", "7", "8", "9", "10", "11"];

  // Lens overlay over image (no zoom) — appears on hover
  const mediaRef = useRef(null);
  const [lensVisible, setLensVisible] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const LENS_SIZE = 120;

  const onMediaMove = (e) => {
    const el = mediaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const relX = e.clientX - rect.left;
    const relY = e.clientY - rect.top;
    const x = Math.max(0, Math.min(rect.width - LENS_SIZE, relX - LENS_SIZE / 2));
    const y = Math.max(0, Math.min(rect.height - LENS_SIZE, relY - LENS_SIZE / 2));
    setLensPos({ x, y });
  };

  const cartProduct = useMemo(() => {
    if (!size) return product;
    return {
      ...product,
      id: `${product.id}-s${size}`,
      name: `${product.name} (Size ${size})`,
    };
  }, [product, size]);

  // No zoom interactions; keep image normal and contained.

  if (!product) {
    return (
      <>
        <SEO title="Product Not Found" description="The product you are looking for is not available." image="/assets/logo.svg" type="website" twitterCard="summary" />
        <section className="container pt-60 pb-60">
          <h3>Product not found</h3>
          <Link to="/shop" className="butn mt-20">Back to Shop</Link>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title={product.name} description={product.description} image={product.image} type="product" twitterCard="summary_large_image" />
      <section className="container page-section product-page">
        <div className="row">
          <div className="col-md-6 mb-20">
            <div
              ref={mediaRef}
              className="pd-media"
              onMouseEnter={() => setLensVisible(true)}
              onMouseLeave={() => setLensVisible(false)}
              onMouseMove={onMediaMove}
            >
              <img src={product.image} alt={product.name} className="img-fluid" />
              <div
                className={`pd-lens${lensVisible ? " visible" : ""}`}
                style={{ width: LENS_SIZE, height: LENS_SIZE, transform: `translate(${lensPos.x}px, ${lensPos.y}px)` }}
              />
            </div>
          </div>
          <div className="col-md-6">
            <h2 className="section-title">{product.name}</h2>
            <div className="h4 mt-10">₹ {product.price}</div>
            
            {/* Sizes */}
            <div className="mt-20">
              <div className="label-sm">Select Size</div>
              <div className="filter-pills size-pills mt-10">
                {sizes.map((s) => (
                  <button
                    key={s}
                    className={`pill${size === s ? " active" : ""}`}
                    onClick={() => setSize(s)}
                    type="button"
                    aria-pressed={size === s}
                    aria-label={`Select size ${s}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
              {!size && <div className="inline-hint">Please select a size</div>}
            </div>

            {/* Quantity + Add to cart */}
            <div className="product-actions d-flex align-items-center mt-20">
              <div className="qty-control">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">-</button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1)))}
                />
                <button onClick={() => setQty((q) => q + 1)} aria-label="Increase">+</button>
              </div>
              <button
                className="butn butn-md butn-rounded ml-10"
                onClick={() => size ? addItem(cartProduct, qty) : null}
                disabled={!size}
                title={!size ? "Select a size" : "Add to Cart"}
              >
                Add to Cart
              </button>
              <Link to="/cart" className="butn butn-md butn-rounded ml-10">Go to cart</Link>
            </div>
          </div>
        </div>
        {/* Tabs for Description / Specs / Reviews */}
        <div className="row mt-40">
          <div className="col-12">
            <div className="tabs-pill" onClick={(e)=>{ e.preventDefault(); e.stopPropagation(); }}>
              {[
                { id: "desc", label: "Description" },
                { id: "specs", label: "Specifications" },
                { id: "reviews", label: "Reviews" },
              ].map((t) => (
                <button
                  key={t.id}
                  className={`pill${tab === t.id ? " active" : ""}`}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); setTab(t.id); }}
                  type="button"
                >
                  {t.label}
                </button>
              ))}
            </div>
            <div className="tab-body card-like mt-15">
              {tab === "desc" && (
                <div>
                  <p>{product.description}</p>
                  <p className="mt-10 opacity-7">Designed for comfort, built for everyday miles. Pair with your favorite fits and go further.</p>
                </div>
              )}
              {tab === "specs" && (
                <ul className="spec-list">
                  <li><strong>Upper:</strong> Breathable knit mesh</li>
                  <li><strong>Midsole:</strong> Responsive EVA foam</li>
                  <li><strong>Outsole:</strong> High-traction rubber</li>
                  <li><strong>Fit:</strong> True to size</li>
                  <li><strong>Weight:</strong> ~280g (UK 9)</li>
                </ul>
              )}
              {tab === "reviews" && (
                <div className="reviews">
                  {[{n:'Aarav',r:5,t:'Super comfy and looks great.'},{n:'Zoya',r:4,t:'Good grip. Feels premium.'},{n:'Kabir',r:5,t:'Perfect daily runner.'}].map((rv) => (
                    <div key={rv.n} className="rv-item">
                      <div className="d-flex justify-content-between">
                        <div className="fw-600">{rv.n}</div>
                        <div className="stars">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <i key={i} className={`fas fa-star${i < rv.r ? '' : '-o'}`}></i>
                          ))}
                        </div>
                      </div>
                      <p className="mt-5">{rv.t}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <Footer />
    </>
  );
}
