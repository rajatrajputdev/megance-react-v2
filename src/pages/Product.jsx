import { useParams, Link } from "react-router-dom";
import { getProductById } from "../data/products.js";
import { useCart } from "../context/CartContext.jsx";
import { useEffect, useMemo, useRef, useState } from "react";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import "./product.css";

export default function ProductPage() {
  const { id } = useParams();
  const product = getProductById(id);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [gender, setGender] = useState("men");
  const [size, setSize] = useState("");

  const genderOptions = useMemo(() => product?.genders || ["men", "women"], [product]);
  const sizes = useMemo(() => (product?.sizes?.[gender] || []), [product, gender]);

  // Initialize gender based on product availability
  useEffect(() => {
    if (product?.genders && product.genders.length > 0) {
      setGender(product.genders[0]);
      setSize("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

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
    if (!size || !gender) return product;
    return {
      ...product,
      id: `${product.id}-${gender}-s${size}`,
      name: `${product.name} (${gender === 'men' ? 'Men' : 'Women'} Size ${size})`,
      meta: { gender, size },
    };
  }, [product, size, gender]);

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
              <img src={product.image} alt={product.name} className="img-fluid" />
              {lensVisible && canHover && (
                <>
                  <div
                    className="pd-lens visible"
                    style={{ width: LENS_SIZE, height: LENS_SIZE, transform: `translate(${lensPos.x}px, ${lensPos.y}px)` }}
                  />
                  <div className="pd-zoom-container">
                    <div className="pd-zoom-image" style={{ backgroundImage: `url(${product.image})`, backgroundPosition: `${zoomPos.x}px ${zoomPos.y}px`, backgroundSize: bgSize }} />
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="col-md-6">
            <h2 className="section-title">{product.name}</h2>
            <div className="h4 mt-10">₹ {product.price}</div>
            
            {/* Gender */}
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

            {/* Sizes (dependent on gender) */}
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
              {sizes.length === 0 && (
                <div className="inline-hint">Not available for the selected gender</div>
              )}
              {!size && sizes.length > 0 && (
                <div className="inline-hint">Select the available size</div>
              )}
            </div>

            {/* Quantity + Add to cart (stacked for white theme) */}
            <div className="pp-actions mt-20">
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
                className="pp-primary-btn"
                onClick={() => (size && gender) ? addItem(cartProduct, qty) : null}
                disabled={!size || !gender}
                title={!size ? "Select a size" : (!gender ? "Select gender" : "Add to Cart")}
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
      <Footer />
    </>
  );
}
