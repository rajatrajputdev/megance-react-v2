import { useCart } from "../context/CartContext.jsx";
import { Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { fetchProducts } from "../services/products";
import SEO from "../components/general_components/SEO.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import "./shop.css";
import { useToast } from "../components/general_components/ToastProvider.jsx";
import Intro from "../components/homepage_components/Intro.jsx";

export default function Shop() {

  const { addItem } = useCart();
  const location = useLocation();
  const { showToast } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [bannerImage, setBannerImage] = useState("/assets/imgs/works/3.webp");

  useEffect(() => {
    const updateBanner = () => {
      if (window.innerWidth <= 768) {
        setBannerImage("/assets/imgs/works/3mob.webp");
      } else {
        setBannerImage("/assets/imgs/works/3.webp");
      }
    };

    updateBanner(); 
    window.addEventListener("resize", updateBanner); 

    return () => window.removeEventListener("resize", updateBanner);
  }, []);

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

  useEffect(() => { const c = load(); return () => { try { c?.(); } catch { } }; }, []);

  // Price filter removed; only gender query param is used below.

  const gender = useMemo(() => new URLSearchParams(location.search).get('g') || 'all', [location.search]);
  const filtered = useMemo(() => {
    return items.filter((p) => (gender === 'all' ? true : (p.genders || []).includes(gender)));
  }, [items, gender]);
  return (
    <>
      <SEO title="Shop" description="Explore featured Megance products and find your perfect pair." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <section
        className="shop-top-banner mt-50"
        aria-label="Megance full screen visual"
        role="img"
      />
      <section className="container page-section shop-page mt-30">
        <div className="row align-items-end">
          <div className="col-lg-8">
            <h1 className="section-title"><h1 className="section-title">{gender === 'men'
              ? 'He Walks'
              : gender === 'women'
                ? 'She Walks'
                : 'Shop'}</h1></h1>
            <p className="mt-10 opacity-7">Explore featured products</p>
          </div>
          <div className="col-lg-4 mt-20 d-flex justify-content-lg-end justify-content-start">
            <Link to="/cart" className="butn butn-md butn-rounded shop-cta">Go to cart</Link>
          </div>
        </div>
      </section>

      <Intro />
      <section className="shop-duo">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-30">
              <h2 className="section-title">Engineered For Every Step</h2>
              <p className="mt-15">From morning runs to late-night strolls, our designs balance cushioning and control so you feel supported all day.</p>
              <p className="mt-10 opacity-7">Dialed-in fit. Breathable comfort. Reliable grip for every surface.</p>
            </div>
            <div className="col-lg-6 mb-30">
              <img
                className="duo-img"
                src={
                  gender === 'men'
                    ? "/assets/imgs/works/mard1.webp"
                    : gender === 'women'
                      ? "/assets/imgs/works/1.webp"
                      : "/assets/imgs/works/mard1.webp"
                }
                alt="Product lifestyle"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Duo section: image left, text right */}
      <section className="shop-duo">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-lg-6 mb-30 order-lg-1">
              <img
                className="duo-img"
                src={
                  gender === 'men'
                    ? "/assets/imgs/works/mard2.webp"
                    : gender === 'women'
                      ? "/assets/imgs/works/2.webp"
                      : "/assets/imgs/works/default.jpg"
                }
                alt="Product lifestyle"
              />
            </div>
            <div className="col-lg-6 mb-30 order-lg-2">
              <h2 className="section-title ml-10">Built Light. Ready to Move.</h2>
              <p className="mt-15 ml-10">City-ready traction meets breathable comfort. Perfect for commutes and weekend wander.</p>
              <p className="mt-10 opacity-7 ml-10" >Flexible uppers and locked-in stability keep you confident at pace.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Fullscreen edge-to-edge image */}

      <section
        className="shop-hero-full mt-10"
        style={{ backgroundImage: `url(${bannerImage})` }}
        aria-label="Megance full screen visual"
      />

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
