import { useParams, Link } from "react-router-dom";
import { db } from "../firebase.js";
import { doc, onSnapshot } from "firebase/firestore";
import { useCart } from "../context/CartContext.jsx";
import { haptic } from "../utils/env.js";
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
  const [showSizeGuide, setShowSizeGuide] = useState(false);

  // ---- Firestore live doc ----
  useEffect(() => {
    setError("");
    setLoading(true);
    const ref = doc(db, "products", id);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        if (snap.exists()) {
          setProduct({ id: snap.id, ...snap.data() });
          setLoading(false);
        } else {
          setProduct(null);
          setLoading(false);
        }
      },
      () => {
        setError("Failed to load product. Please try again.");
        setLoading(false);
      }
    );
    return () => unsub();
  }, [id]);

  const { addItem, items } = useCart();
  const { showToast } = useToast();

  const [qty, setQty] = useState(1);
  const [gender, setGender] = useState("men");
  const [size, setSize] = useState("");
  const addBtnRef = useRef(null);

  const runAddBtnWiggle = () => {
    try {
      const el = addBtnRef.current;
      if (!el) return;
      el.classList.remove('btn-wiggle');
      void el.offsetWidth;
      el.classList.add('btn-wiggle');
      setTimeout(() => {
        try { el.classList.remove('btn-wiggle'); } catch {}
      }, 420);
    } catch {}
  };

  // ---- Product/Gender/Size helpers ----
  const hasGenders = useMemo(
    () => Array.isArray(product?.genders) && product.genders.length > 0,
    [product]
  );

  const genderOptions = useMemo(
    () => (hasGenders ? product.genders : []),
    [hasGenders, product]
  );

  const sizes = useMemo(() => {
    if (!product) return [];
    if (hasGenders) {
      const q = product?.sizeQuantities?.[gender];
      if (Array.isArray(q) && q.length) {
        // Show all listed sizes even if quantity is 0 (disabled later)
        return q.map((s) => String(s.size));
      }
      const raw = product?.sizes?.[gender] || [];
      if (Array.isArray(raw))
        return raw.map((s) => (typeof s === "object" ? String(s.size) : String(s)));
      return [];
    }
    const raw = product?.sizes || [];
    if (Array.isArray(raw)) {
      if (raw.length && typeof raw[0] === "object") {
        // Show all listed sizes even if quantity is 0 (disabled later)
        return raw.map((s) => String(s.size));
      }
      return raw.map((s) => (typeof s === "object" ? String(s.size) : String(s)));
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
    if (
      Array.isArray(product?.sizes) &&
      product.sizes.length &&
      typeof product.sizes[0] === "object"
    ) {
      const row = product.sizes.find((r) => String(r.size) === String(size));
      return Math.max(0, Number(row?.quantity) || 0);
    }
    return Infinity;
  }, [product, hasGenders, gender, size]);

  const remainingForSize = useMemo(() => {
    if (!size) return maxQtyForSize;
    const cid = `${product?.id}${hasGenders ? `-${gender}` : ""}-s${size}`;
    const inCart = (items || []).find((x) => x.id === cid)?.qty || 0;
    if (!Number.isFinite(maxQtyForSize)) return Infinity;
    return Math.max(0, maxQtyForSize - inCart);
  }, [items, product?.id, hasGenders, gender, size, maxQtyForSize]);

  // Initialize gender and size
  useEffect(() => {
    if (hasGenders) {
      setGender(product.genders[0]);
      setSize("");
    }
  }, [product?.id, hasGenders]); // eslint-disable-line

  useEffect(() => {
    if (Array.isArray(sizes) && sizes.length === 1) {
      setSize(String(sizes[0]));
    }
  }, [sizes.join(",")]); // eslint-disable-line

  // Scroll to top on product change
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, behavior: "instant" });
    } catch {
      window.scrollTo(0, 0);
    }
  }, [product?.id]);

  // ---- Hover capability detect (for zoom) ----
  const [canHover, setCanHover] = useState(true);
  useEffect(() => {
    try {
      const mql = window.matchMedia("(hover: hover) and (pointer: fine)");
      setCanHover(mql.matches);
      const handler = (e) => setCanHover(e.matches);
      if (mql.addEventListener) mql.addEventListener("change", handler);
      else if (mql.addListener) mql.addListener(handler);
      return () => {
        if (mql.removeEventListener) mql.removeEventListener("change", handler);
        else if (mql.removeListener) mql.removeListener(handler);
      };
    } catch {
      setCanHover(true);
    }
  }, []);

  // ---- Image/SEO JSON-LD basics ----
  const fallbackImage = "/assets/logo.svg";
  const imageSrc = product?.imageUrl || product?.image || fallbackImage;

  // Prepare images array (future ready). For now, single image is fine.
  const images = useMemo(() => {
    const arr =
      product?.images ||
      product?.gallery ||
      (product?.imageUrl ? [product.imageUrl] : []) ||
      (product?.image ? [product.image] : []);
    const cleaned = Array.isArray(arr) ? arr.filter(Boolean) : [];
    return cleaned.length ? cleaned : [imageSrc];
  }, [product, imageSrc]);

  const [imgIdx, setImgIdx] = useState(0);
  useEffect(() => {
    setImgIdx(0);
  }, [product?.id]);

  const mainImage = images[imgIdx] || imageSrc;

  const productJsonLd = useMemo(() => {
    if (!product) return null;
    const availability =
      (Number(product.quantity) || 0) > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock";
    const url =
      typeof window !== "undefined" && window.location
        ? window.location.href
        : `/product/${product.id}`;
    // Include multiple images if available for richer previews
    const data = {
      "@context": "https://schema.org",
      "@type": "Product",
      name: product.name,
      image: Array.isArray(images) && images.length ? images.slice(0, 6) : [mainImage],
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
    try {
      return JSON.stringify(data);
    } catch {
      return null;
    }
  }, [product, images]);

  // ---- Zoom lens state & math ----
  const mediaRef = useRef(null);
  const thumbStripRef = useRef(null);
  const imgElRef = useRef(null);
  const zoomElRef = useRef(null);
  const [lensVisible, setLensVisible] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [zoomPos, setZoomPos] = useState({ x: 0, y: 0 });
  const [bgSize, setBgSize] = useState("0px 0px");
  const LENS_SIZE = 120;
  const ZOOM_LEVEL = 2.5;

const onMediaMove = (e) => {
  const mediaEl = mediaRef.current;
  const imgEl = imgElRef.current;
  if (!mediaEl || !imgEl) return;
  const rect = mediaEl.getBoundingClientRect();

  // With object-fit: cover, the image is scaled by the larger factor
  const natW = imgEl.naturalWidth || rect.width;
  const natH = imgEl.naturalHeight || rect.height;
  if (!natW || !natH) return;
  const scale = Math.max(rect.width / natW, rect.height / natH) || 1;
  const dispW = natW * scale;
  const dispH = natH * scale;
  const offX = (rect.width - dispW) / 2;  // negative when image spills outside
  const offY = (rect.height - dispH) / 2; // negative when image spills outside

  const clientX = e.touches?.[0]?.clientX ?? e.clientX;
  const clientY = e.touches?.[0]?.clientY ?? e.clientY;
  const cx = clientX - rect.left;
  const cy = clientY - rect.top;

  // Clamp lens within the visible media box, not the (possibly larger) image
  const minLX = 0;
  const minLY = 0;
  const maxLX = rect.width - LENS_SIZE;
  const maxLY = rect.height - LENS_SIZE;
  const lensX = Math.max(minLX, Math.min(cx - LENS_SIZE / 2, maxLX));
  const lensY = Math.max(minLY, Math.min(cy - LENS_SIZE / 2, maxLY));
  setLensPos({ x: lensX, y: lensY });

  // Background (zoom) image size equals displayed image size times zoom level
  const bgWidth = dispW * ZOOM_LEVEL;
  const bgHeight = dispH * ZOOM_LEVEL;
  setBgSize(`${Math.round(bgWidth)}px ${Math.round(bgHeight)}px`);

  // Map lens center to the underlying (possibly larger) image coordinates
  const lensCenterXInImg = lensX + LENS_SIZE / 2 - offX; // subtract negative offset
  const lensCenterYInImg = lensY + LENS_SIZE / 2 - offY;
  const lensCenterNormX = Math.max(0, Math.min(1, lensCenterXInImg / dispW));
  const lensCenterNormY = Math.max(0, Math.min(1, lensCenterYInImg / dispH));

  const zoomW = zoomElRef.current?.offsetWidth || 180;
  const zoomH = zoomElRef.current?.offsetHeight || 180;
  const bgX = zoomW / 2 - lensCenterNormX * bgWidth;
  const bgY = zoomH / 2 - lensCenterNormY * bgHeight;
  setZoomPos({ x: bgX, y: bgY });
};

  const onMediaEnter = () => {
    if (canHover) setLensVisible(true);
  };
  const onMediaLeave = () => {
    setLensVisible(false);
  };

  const scrollThumbs = (dir = 1) => {
    const el = thumbStripRef.current;
    if (!el) return;
    const delta = dir * 120;
    try {
      if (typeof el.scrollBy === 'function') el.scrollBy({ left: delta, behavior: 'smooth' });
      else el.scrollLeft += delta;
    } catch {
      el.scrollLeft += delta;
    }
    // Move selection; wrap around so arrows always change image
    setImgIdx((i) => {
      const n = images.length || 1;
      return ((i + dir) % n + n) % n;
    });
  };

  // Center active thumbnail in the strip
  useEffect(() => {
    const wrap = thumbStripRef.current;
    if (!wrap) return;
    const children = wrap.children || [];
    const node = children[imgIdx];
    if (!node || typeof node.offsetLeft !== 'number') return;
    const target = node.offsetLeft - (wrap.clientWidth - node.clientWidth) / 2;
    try {
      if (typeof wrap.scrollTo === 'function') wrap.scrollTo({ left: target, behavior: 'smooth' });
      else wrap.scrollLeft = target;
    } catch {
      wrap.scrollLeft = target;
    }
  }, [imgIdx, images.length]);

  const cartProduct = useMemo(() => {
    if (!product) return null;
    if (!size) return product;
    const genderPart = hasGenders ? `-${gender}` : "";
    return {
      ...product,
      id: `${product.id}${genderPart}-s${size}`,
      name: hasGenders
        ? `${product.name} (${gender === "men" ? "Men" : "Women"} Size ${size})`
        : `${product.name} (Size ${size})`,
      // Ensure cart always carries an image for display
      image: product.image || product.imageUrl || mainImage || "/assets/logo.svg",
      meta: hasGenders ? { gender, size } : { size },
    };
  }, [product, size, gender, hasGenders]);

  // ---- Error / Not found / Loading ----
  if (!loading && error) {
    return (
      <>
        <SEO
          title="Error"
          description="Problem loading product."
          image="/assets/logo.svg"
          type="website"
          twitterCard="summary"
        />
        <section className="container pt-60 pb-60" role="alert" aria-live="assertive">
          <h3>We couldn’t load this product</h3>
          <p className="mt-10">{error}</p>
          <button
            className="butn mt-10"
            onClick={() => {
              try {
                window.location.reload();
              } catch {}
            }}
          >
            Retry
          </button>
          <Link to="/shop" className="butn mt-10 ml-10">
            Back to Shop
          </Link>
        </section>
      </>
    );
  }

  if (!loading && !product) {
    return (
      <>
        <SEO
          title="Product Not Found"
          description="The product you are looking for is not available."
          image="/assets/logo.svg"
          type="website"
          twitterCard="summary"
        />
        <section className="container pt-60 pb-60">
          <h3>Product not found</h3>
          <Link to="/shop" className="butn mt-20">
            Back to Shop
          </Link>
        </section>
      </>
    );
  }

  if (loading) {
    return (
      <>
        <SEO
          title="Loading Product"
          description="Loading product details"
          image="/assets/logo.svg"
          type="website"
          twitterCard="summary"
        />
        <section className="container page-section nav-offset product-page-wrap">
          <div className="row">
            <div className="col-md-6 mb-20">
              <div className="pd-media">
                <div
                  className="skeleton skeleton-image"
                  style={{ width: "100%", height: 380 }}
                />
              </div>
            </div>
            <div className="col-md-6">
              <div className="skeleton skeleton-line" style={{ width: "60%", height: 28 }} />
              <div
                className="skeleton skeleton-line"
                style={{ width: "30%", height: 22, marginTop: 10 }}
              />
              <div
                className="skeleton skeleton-line"
                style={{ width: "100%", height: 16, marginTop: 20 }}
              />
              <div
                className="skeleton skeleton-line"
                style={{ width: "90%", height: 16, marginTop: 10 }}
              />
              <div
                className="skeleton skeleton-line"
                style={{ width: "80%", height: 16, marginTop: 10 }}
              />
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <SEO
        title={product.name}
        description={product.description}
        image={mainImage}
        type="product"
        twitterCard="summary_large_image"
      />
      <section
        className="container page-section nav-offset product-page-wrap"
        onClick={(e) => {
          // prevent any bubbling handlers
          e.stopPropagation();
        }}
      >
        <div className="row">
          {/* ---------- MEDIA COLUMN ---------- */}
          <div className="col-md-6 mb-20">
            <div className="pd-stage">
              <div
                ref={mediaRef}
                className={`pd-media ${lensVisible && canHover ? "is-zooming" : ""}`}
                onMouseEnter={onMediaEnter}
                onMouseLeave={onMediaLeave}
                onMouseMove={onMediaMove}
                onTouchStart={() => setLensVisible((v) => !v)} // tap to toggle zoom on touch
                onTouchMove={onMediaMove}
              >
                {/* Square keeper for fallback */}
                <div className="pd-media-keeper" aria-hidden="true" />
                <img ref={imgElRef} src={mainImage} alt={product.name} className="pd-main-img" />
                {lensVisible && (
                  <>
                    <div
                      className="pd-lens visible"
                      style={{
                        width: LENS_SIZE,
                        height: LENS_SIZE,
                        transform: `translate(${lensPos.x}px, ${lensPos.y}px)`,
                      }}
                    />
                    {canHover && (
                      <div className="pd-zoom-container" ref={zoomElRef}>
                        <div
                          className="pd-zoom-image"
                          style={{
                            backgroundImage: `url(${mainImage})`,
                            backgroundPosition: `${zoomPos.x}px ${zoomPos.y}px`,
                            backgroundSize: bgSize,
                          }}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Thumbs only if >1 image (future ready) */}
              {images.length > 1 && (
                <div className="pd-thumbbar">

                  <div
                    className="pd-thumbstrip"
                    ref={thumbStripRef}
                    role="listbox"
                    aria-label="Product images"
                  >
                    {images.map((src, i) => {
                      const active = i === imgIdx;
                      return (
                        <button
                          key={i}
                          className={`pd-thumb ${active ? "active" : ""}`}
                          onClick={() => setImgIdx(i)}
                          aria-pressed={active}
                          aria-label={`Show image ${i + 1}`}
                          type="button"
                        >
                          <img src={src} alt={`Thumbnail ${i + 1}`} />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ---------- DETAILS COLUMN ---------- */}
          <div className="col-md-6">
            <h2 className="section-title">{product.name}</h2>
            <div className="h4 mt-10">₹ {product.price}  <span style={{fontWeight:'300', fontSize:"12px"}}>Inclusive of GST* and free shipping. COD available on eligible pin codes</span>
</div>
            
            {hasGenders && (
              <div className="mt-20">
                <div className="label-sm">Select Gender</div>
                <div className="filter-pills mt-10">
                  {genderOptions.map((g) => (
                    <button
                      key={g}
                      className={`pill${gender === g ? " active" : ""}`}
                      onClick={() => {
                        setGender(g);
                        setSize("");
                      }}
                      type="button"
                      aria-pressed={gender === g}
                      aria-label={`Select ${g}`}
                    >
                      {g === "men" ? "Men" : "Women"}
                    </button>
                  ))}
                </div>
              </div>
            )}
{/* ✅ Size Guide Toggle Button Styled Like Pills */}
<div className="mt-20">
  <div className="filter-pills size-pills">
    <button
      type="button"
      className={`pill${showSizeGuide ? " active" : ""}`}
      style={{ cursor: "pointer" }}
      onClick={() => setShowSizeGuide(prev => !prev)}
    >
      {showSizeGuide ? "Hide Size Guide" : "Size Guide"}
    </button>
  </div>

  {showSizeGuide && (
    <div className="size_guide mt-10">
      <img
        src="/assets/imgs/size.jpeg"
        alt="Size Chart"
        style={{ width: "100%", maxWidth: "380px", borderRadius: "8px" }}
      />
    </div>
  )}
</div>

{/* <div className="mt-20">
                <div className="filter-pills">
                 <div className="size_guide">
                  <img src="/assets/imgs/size.jpeg" alt="Size Chart" />
                 </div>
                </div>
              </div> */}
            {/* Sizes */}
            <div className="mt-20">
              <div className="label-sm">Select Size</div>
              <div className="filter-pills size-pills mt-10">
                {sizes.map((s) => {
                  let available = Infinity;
                  if (hasGenders) {
                    const row = product?.sizeQuantities?.[gender]?.find(
                      (r) => String(r.size) === String(s)
                    );
                    available = Number(row?.quantity) || 0;
                  } else if (
                    Array.isArray(product?.sizes) &&
                    product.sizes.length &&
                    typeof product.sizes[0] === "object"
                  ) {
                    const row = product.sizes.find(
                      (r) => String(r.size) === String(s)
                    );
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
                      title={`Size ${s}`}
                    >
                      {s}
                      {disabled && <span className="pill-badge">Out</span>}
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
              {size &&
                Number.isFinite(maxQtyForSize) &&
                maxQtyForSize !== Infinity &&
                maxQtyForSize > 0 &&
                maxQtyForSize < 10 && (
                  <div className="inline-hint">Only {maxQtyForSize} available</div>
                )}

                 <span style={{fontWeight:'500', fontSize:"15px"}}>• Delivery in 3 - 5 days &nbsp;&nbsp;• Free Shipping<br/>• 5 Days Return Policy</span>
            </div>

            {/* Quantity + Add to cart */}
            <div className="pp-actions mt-20">
              <div className="qty-control">
                <button
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease"
                >
                  -
                </button>
                <input
                  type="number"
                  min={1}
                  value={Math.min(
                    qty,
                    Number.isFinite(remainingForSize)
                      ? Math.max(1, remainingForSize)
                      : qty
                  )}
                  onChange={(e) => {
                    const val = Math.max(1, parseInt(e.target.value || 1));
                    const cap = Number.isFinite(remainingForSize)
                      ? remainingForSize
                      : Infinity;
                    setQty(Math.min(cap, val));
                  }}
                />
                <button
                  onClick={() =>
                    setQty((q) =>
                      Number.isFinite(remainingForSize)
                        ? Math.min(remainingForSize, q + 1)
                        : q + 1
                    )
                  }
                  aria-label="Increase"
                >
                  +
                </button>
              </div>
              <button
                className="pp-primary-btn"
                ref={addBtnRef}
                onClick={() => {
                  if (!size) return;
                  const currentInCart = (() => {
                    const cid = cartProduct?.id;
                    if (!cid) return 0;
                    const found = (items || []).find((x) => x.id === cid);
                    return Number(found?.qty) || 0;
                  })();
                  const max = Number.isFinite(maxQtyForSize)
                    ? maxQtyForSize
                    : Infinity;
                  const remaining = Math.max(0, max - currentInCart);
                  const clamped = Math.min(remaining, qty);
                  if (clamped <= 0) return;
                  runAddBtnWiggle();
                  try { haptic(35); } catch {}
                  addItem(cartProduct, clamped);
                  try {
                    showToast("success", "Added to cart");
                  } catch {}
                }}
                disabled={
                  !size ||
                  (Number.isFinite(maxQtyForSize) && maxQtyForSize <= 0) ||
                  remainingForSize === 0
                }
                title={
                  !size ? "Select a size" : "Add to Cart"
                }
              >
                Add to Cart
              </button>
              <Link to="/cart" className="pp-secondary-btn">
                Go to Cart
              </Link>
            </div>
          </div>
        </div>

        {/* Description + Specifications */}
        <div className="row mt-40">
          <div className="col-12">
            <div className="pp-section card-like">
              <h3>Description</h3>
              <p className="mt-10">{product.description}</p>
              <p className="mt-10 opacity-7">
                Designed for comfort, built for everyday miles. Pair with your favorite
                fits and go further.
              </p>
            </div>
            <div className="pp-section card-like mt-20">
              <h3>Specifications</h3>
              <ul className="spec-list mt-10">
                <li>
                  <strong>Upper Material:</strong> Premium full suede upper with genuine leather M branding
                </li>
                <li>
                  <strong>Lining:</strong> Breathable inner lining for sweat-free comfort
                </li>
                <li>
                  <strong>Insole:</strong> Ergonomic PU foam insole providing stable arch support and resilience
                </li>
                <li>
                  <strong>Outsole:</strong> Lightweight rubber sole designed for smooth urban movement
                </li>
                <li>
                  <strong>Fit:</strong> True to size – crafted for everyday wearability and comfort


                </li>
                <li>
                  <strong>Weight:</strong> Approx. 315g per shoe
                </li>
                <li>
                  <strong>Care Guide:</strong> <br/> Protect with suede spray before first wear; clean using a suede brush or soft cloth
                </li>
                <li>
                  <strong>Sustainability:</strong> <br/> Each MEGANCE sneaker is crafted in small batches using ethically sourced suede and leather, with eco-friendly packaging.
                </li>
                <li>
                  <strong>Packaging:</strong> <br/> Delivered in a recyclable luxury box featuring the embossed MEGANCE emblem and dust bag for protection with extra laces provided in the box for unique styling.
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {productJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: productJsonLd }}
        />
      )}
      <Footer />
    </>
  );
}
