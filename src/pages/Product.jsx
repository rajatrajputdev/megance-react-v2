import { useParams, Link } from "react-router-dom";
import { fetchProductById } from "../services/products";
import { useCart } from "../context/CartContext.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import "./product.css";
import { useToast } from "../components/general_components/ToastProvider.jsx";

export default function ProductPage() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = async () => {
    let canceled = false;
    try {
      setError("");
      setLoading(true);
      const p = await fetchProductById(id);
      if (canceled) return;
      setProduct(p);
    } catch (e) {
      if (canceled) return;
      setError("Failed to load product. Please try again.");
    } finally {
      if (!canceled) setLoading(false);
    }
    return () => { canceled = true; };
  };
  useEffect(() => { const c = load(); return () => { try { c?.(); } catch {} }; }, [id]);
  const { addItem, items } = useCart();
  const { showToast } = useToast();
  const [qty, setQty] = useState(1);
  const [gender, setGender] = useState("men");
  const [size, setSize] = useState("");

  const hasGenders = useMemo(() => Array.isArray(product?.genders) && product.genders.length > 0, [product]);
  const genderOptions = useMemo(() => (hasGenders ? product.genders : []), [hasGenders, product]);
  const sizes = useMemo(() => {
    if (!product) return [];
    if (hasGenders) {
      const q = product?.sizeQuantities?.[gender];
      if (Array.isArray(q) && q.length) {
        return q.filter((s) => (s?.quantity ?? 0) > 0).map((s) => String(s.size));
      }
      const raw = product?.sizes?.[gender] || [];
      if (Array.isArray(raw)) return raw.map((s) => (typeof s === 'object' ? String(s.size) : String(s)));
      return [];
    }
    const raw = product?.sizes || [];
    if (Array.isArray(raw)) {
      if (raw.length && typeof raw[0] === 'object') {
        return raw.filter((s) => (s?.quantity ?? 0) > 0).map((s) => String(s.size));
      }
      return raw.map((s) => (typeof s === 'object' ? String(s.size) : String(s)));
    }
    return [];
  }, [product, gender, hasGenders]);

  const maxQtyForSize = useMemo(() => {
    if (!product || !size) return Infinity;
    if (hasGenders) {
      const list = product?.sizeQuantities?.[gender];
      if (Array.isArray(list)) {
        const row = list.find((r) => String(r.size) === String(size));
        return Math.max(0, Number(row?.quantity) || 0);
      }
      return Infinity;
    }
    if (Array.isArray(product?.sizes) && product.sizes.length && typeof product.sizes[0] === 'object') {
      const row = product.sizes.find((r) => String(r.size) === String(size));
      return Math.max(0, Number(row?.quantity) || 0);
    }
    return Infinity;
  }, [product, hasGenders, gender, size]);

  const remainingForSize = useMemo(() => {
    if (!size) return maxQtyForSize;
    const id = `${product?.id}${hasGenders ? `-${gender}` : ''}-s${size}`;
    const inCart = (items || []).find((x) => x.id === id)?.qty || 0;
    if (!Number.isFinite(maxQtyForSize)) return Infinity;
    return Math.max(0, maxQtyForSize - inCart);
  }, [items, product?.id, hasGenders, gender, size, maxQtyForSize]);

  // Initialize gender based on product availability
  useEffect(() => {
    if (hasGenders) {
      setGender(product.genders[0]);
      setSize("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id, hasGenders]);

  // If only one size available (for current gender), preselect it
  useEffect(() => {
    if (Array.isArray(sizes) && sizes.length === 1) {
      setSize(String(sizes[0]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sizes.join(',')]);

  // Ensure page is scrolled to top when viewing a product
  useEffect(() => {
    try { window.scrollTo({ top: 0, behavior: 'instant' }); } catch(_) { window.scrollTo(0,0); }
  }, [product?.id]);
  useEffect(() => {
    try {
      const mql = window.matchMedia('(hover: hover) and (pointer: fine)');
      setCanHover(mql.matches);
      const handler = (e) => setCanHover(e.matches);
      if (mql.addEventListener) mql.addEventListener('change', handler);
      else if (mql.addListener) mql.addListener(handler);
      return () => {
        if (mql.removeEventListener) mql.removeEventListener('change', handler);
        else if (mql.removeListener) mql.removeListener(handler);
      };
    } catch { setCanHover(true); }
  }, []);
  const mediaRef = useRef(null);
  const [lensVisible, setLensVisible] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [bgSize, setBgSize] = useState("0px 0px");
  const LENS_SIZE = 120;
  const ZOOM_LEVEL = 2.5;
  const [canHover, setCanHover] = useState(true);

  const onMediaMove = (e) => {
    const el = mediaRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const lensX = Math.max(0, Math.min(x - LENS_SIZE / 2, rect.width - LENS_SIZE));
    const lensY = Math.max(0, Math.min(y - LENS_SIZE / 2, rect.height - LENS_SIZE));
    setLensPos({ x: lensX, y: lensY });

    const zoomX = -(lensX * ZOOM_LEVEL);
    const zoomY = -(lensY * ZOOM_LEVEL);
    setZoomPos({ x: zoomX, y: zoomY });
    setBgSize(`${Math.round(rect.width * ZOOM_LEVEL)}px ${Math.round(rect.height * ZOOM_LEVEL)}px`);
  };
  const onMediaEnter = () => { if (canHover) setLensVisible(true); };
  const onMediaLeave = () => { setLensVisible(false); };

  const cartProduct = useMemo(() => {
    if (!product) return null;
    if (!size) return product;
    const genderPart = hasGenders ? `-${gender}` : "";
    return {
      ...product,
      id: `${product.id}${genderPart}-s${size}`,
      name: hasGenders ? `${product.name} (${gender === 'men' ? 'Men' : 'Women'} Size ${size})` : `${product.name} (Size ${size})`,
      meta: hasGenders ? { gender, size } : { size },
    };
  }, [product, size, gender, hasGenders]);

  // Image + JSON-LD should not be behind conditional returns; compute early
  const imageSrc = product?.imageUrl || product?.image || "/assets/logo.svg";
  const productJsonLd = useMemo(() => {
    if (!product) return null;
    const availability = (Number(product.quantity) || 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
    const url = (typeof window !== 'undefined' && window.location) ? window.location.href : `/product/${product.id}`;
    const data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: [imageSrc],
      description: product.description || "",
      sku: product.id,
      brand: { "@type": "Brand", name: "Megance" },
      offers: {
        "@type": "Offer",
        priceCurrency: "INR",
        price: Number(product.price) || 0,
        availability,
        url,
      },
    };
    try { return JSON.stringify(data); } catch { return null; }
  }, [product, imageSrc]);

  // No zoom interactions; keep image normal and contained.

  if (!loading && error) {
    return (
      <>
        <SEO title="Error" description="Problem loading product." image="/assets/logo.svg" type="website" twitterCard="summary" />
        <section className="container pt-60 pb-60" role="alert" aria-live="assertive">
          <h3>We couldn’t load this product</h3>
          <p className="mt-10">{error}</p>
          <button className="butn mt-10" onClick={load}>Retry</button>
          <Link to="/shop" className="butn mt-10 ml-10">Back to Shop</Link>
        </section>
      </>
    );
  }

  if (!loading && !product) {
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

  if (loading) {
    return (
      <>
        <SEO title="Loading Product" description="Loading product details" image="/assets/logo.svg" type="website" twitterCard="summary" />
        <section className="container page-section nav-offset product-page-wrap">
          <div className="row">
            <div className="col-md-6 mb-20">
              <div className="pd-media"><div className="skeleton skeleton-image" style={{ width: '100%', height: 380 }} /></div>
            </div>
            <div className="col-md-6">
              <div className="skeleton skeleton-line" style={{ width: '60%', height: 28 }} />
              <div className="skeleton skeleton-line" style={{ width: '30%', height: 22, marginTop: 10 }} />
              <div className="skeleton skeleton-line" style={{ width: '100%', height: 16, marginTop: 20 }} />
              <div className="skeleton skeleton-line" style={{ width: '90%', height: 16, marginTop: 10 }} />
              <div className="skeleton skeleton-line" style={{ width: '80%', height: 16, marginTop: 10 }} />
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO title={product.name} description={product.description} image={imageSrc} type="product" twitterCard="summary_large_image" />
      <section className="container page-section nav-offset product-page-wrap" onClick={(e)=>{ /* prevent any bubbling handlers */ e.stopPropagation(); }}>
        <div className="row">
          <div className="col-md-6 mb-20">
            <div
              ref={mediaRef}
              className="pd-media"
              onMouseEnter={onMediaEnter}
              onMouseLeave={onMediaLeave}
              onMouseMove={onMediaMove}
            >
              <img src={imageSrc} alt={product.name} className="img-fluid" />
              {lensVisible && canHover && (
                <>
                  <div
                    className="pd-lens visible"
                    style={{ width: LENS_SIZE, height: LENS_SIZE, transform: `translate(${lensPos.x}px, ${lensPos.y}px)` }}
                  />
                  <div className="pd-zoom-container">
                    <div className="pd-zoom-image" style={{ backgroundImage: `url(${imageSrc})`, backgroundPosition: `${zoomPos.x}px ${zoomPos.y}px`, backgroundSize: bgSize }} />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <h2 className="section-title">{product.name}</h2>
            <div className="h4 mt-10">₹ {product.price}</div>
            
            {hasGenders && (
              <div className="mt-20">
                <div className="label-sm">Select Gender</div>
                <div className="filter-pills mt-10">
                  {genderOptions.map((g) => (
                    <button
                      key={g}
                      className={`pill${gender === g ? ' active' : ''}`}
                      onClick={() => { setGender(g); setSize(''); }}
                      type="button"
                      aria-pressed={gender === g}
                      aria-label={`Select ${g}`}
                    >
                      {g === 'men' ? 'Men' : 'Women'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Sizes (dependent on gender) */}
            <div className="mt-20">
              <div className="label-sm">Select Size</div>
              <div className="filter-pills size-pills mt-10">
                {sizes.map((s) => {
                  let available = Infinity;
                  if (hasGenders) {
                    const row = product?.sizeQuantities?.[gender]?.find((r) => String(r.size) === String(s));
                    available = Number(row?.quantity) || 0;
                  } else if (Array.isArray(product?.sizes) && product.sizes.length && typeof product.sizes[0] === 'object') {
                    const row = product.sizes.find((r) => String(r.size) === String(s));
                    available = Number(row?.quantity) || 0;
                  }
                  const disabled = available === 0;
                  return (
                    <button
                      key={s}
                      className={`pill${size === s ? " active" : ""}`}
                      onClick={() => setSize(s)}
                      type="button"
                      aria-pressed={size === s}
                      aria-label={`Select size ${s}`}
                      disabled={disabled}
                      title={disabled ? "Out of stock" : `Size ${s}`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
              {sizes.length === 0 && (
                <div className="inline-hint">Not available for the selected gender</div>
              )}
              {!size && sizes.length > 0 && (
                <div className="inline-hint">Select the available size</div>
              )}
              {size && Number.isFinite(remainingForSize) && remainingForSize !== Infinity && (
                <div className="inline-hint">Only {remainingForSize} left</div>
              )}
            </div>

            {/* Quantity + Add to cart (stacked for white theme) */}
            <div className="pp-actions mt-20">
              <div className="qty-control">
                <button onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease">-</button>
                <input
                  type="number"
                  min={1}
                  value={Math.min(qty, Number.isFinite(remainingForSize) ? Math.max(1, remainingForSize) : qty)}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value || 1));
                    const cap = Number.isFinite(remainingForSize) ? remainingForSize : Infinity;
                    setQty(Math.min(cap, val));
                  }}
                />
                <button onClick={() => setQty((q) => (Number.isFinite(remainingForSize) ? Math.min(remainingForSize, q + 1) : q + 1))} aria-label="Increase">+</button>
              </div>
              <button
                className="pp-primary-btn"
                onClick={() => {
                  if (!size) return;
                  const currentInCart = (() => {
                    const id = cartProduct?.id;
                    if (!id) return 0;
                    const found = (items || []).find((x) => x.id === id);
                    return Number(found?.qty) || 0;
                  })();
                  const max = Number.isFinite(maxQtyForSize) ? maxQtyForSize : Infinity;
                  const remaining = Math.max(0, max - currentInCart);
                  const clamped = Math.min(remaining, qty);
                  if (clamped <= 0) return;
                  addItem(cartProduct, clamped);
                  try { showToast('success', 'Added to cart'); } catch {}
                }}
                disabled={!size || (Number.isFinite(maxQtyForSize) && maxQtyForSize <= 0)}
                title={!size ? "Select a size" : (maxQtyForSize <= 0 ? "Out of stock" : "Add to Cart")}
              >
                Add to Cart
              </button>
              <Link to="/cart" className="pp-secondary-btn">Go to Cart</Link>
            </div>
          </div>
        </div>
        {/* Continuous content: Description + Specifications (no reviews) */}
        <div className="row mt-40">
          <div className="col-12">
            <div className="pp-section card-like">
              <h3>Description</h3>
              <p className="mt-10">{product.description}</p>
              <p className="mt-10 opacity-7">Designed for comfort, built for everyday miles. Pair with your favorite fits and go further.</p>
            </div>
            <div className="pp-section card-like mt-20">
              <h3>Specifications</h3>
              <ul className="spec-list mt-10">
                <li><strong>Upper:</strong> Breathable knit mesh</li>
                <li><strong>Midsole:</strong> Responsive EVA foam</li>
                <li><strong>Outsole:</strong> High-traction rubber</li>
                <li><strong>Fit:</strong> True to size</li>
                <li><strong>Weight:</strong> ~280g (UK 9)</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {productJsonLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd }} />
      )}
      <Footer />
    </>
  );
}
