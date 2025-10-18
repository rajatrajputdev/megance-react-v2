import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import IntroProductCard from "./IntroProductCard.jsx";
import { fetchProductsByCategoryName, fetchProductsByTag } from "../../services/products.js";
import "./intro.css";

export default function Intro() {
  const swiperRef = useRef(null);
  const navigate = useNavigate();
  const [slides, setSlides] = useState([]);

  // ✅ Fetch Featured Products
  useEffect(() => {
    let canceled = false;

    const fetchOne = async (label) => {
      try {
        let list = await fetchProductsByCategoryName(label, { visibleOnly: true, limit: 1 });
        if (!Array.isArray(list) || list.length === 0) {
          list = await fetchProductsByTag(label, { visibleOnly: true, limit: 1 });
        }
        return Array.isArray(list) && list[0] ? list[0] : null;
      } catch (e) {
        console.warn('Intro: failed to fetch', label, e?.code || e?.message || e);
        return null;
      }
    };

    (async () => {
      try {
        const labels = [
          { badge: "TRENDING", key: "trending" },
          { badge: "NEW ARRIVAL", key: "new-arrival" },
          { badge: "BESTSELLER", key: "bestseller" },
          { badge: "FEATURED", key: "featured" },
        ];
        const res = [];
        for (const l of labels) {
          const p = await fetchOne(l.key);
          if (canceled) return;
          if (p) res.push({ badge: l.badge, product: p });
        }
        if (!canceled) setSlides(res);
      } catch (e) {
        console.warn('Intro: fetch sequence failed', e?.code || e?.message || e);
        if (!canceled) setSlides([]);
      }
    })();

    return () => { canceled = true; };
  }, []);

  // ✅ Swiper Initialization
  useEffect(() => {
    const initSwiper = () => {
      const SwiperCtor = window.Swiper;
      if (typeof SwiperCtor !== "function") return false;

      if (swiperRef.current) {
        try {
          swiperRef.current.destroy(true, true);
        } catch (_) {}
        swiperRef.current = null;
      }

      const isMobile = window.innerWidth <= 768;
      swiperRef.current = new SwiperCtor(".shoe-carousel", {
        slidesPerView: isMobile ? 1.1 : 4,
        spaceBetween: isMobile ? 14 : 24,
        centeredSlides: isMobile,
        loop: isMobile,
        autoplay: isMobile
          ? { delay: 2500, disableOnInteraction: false }
          : false,
        speed: 600,
        grabCursor: true,
        breakpoints: {
          320: { slidesPerView: 1.1, spaceBetween: 12 },
          480: { slidesPerView: 1.2, spaceBetween: 14 },
          768: { slidesPerView: 3, spaceBetween: 18 },
          1024: { slidesPerView: 4, spaceBetween: 24 },
        },
      });

      return true;
    };

    const onResize = () => {
      clearTimeout(window.__shoeSwiperResizeTo);
      window.__shoeSwiperResizeTo = setTimeout(initSwiper, 200);
    };

    const onVendors = () => initSwiper();
    window.addEventListener("load", initSwiper);
    window.addEventListener("resize", onResize);
    window.addEventListener("vendors:ready", onVendors);

    // Retry until Swiper is ready
    if (!initSwiper()) {
      let tries = 0;
      const timer = setInterval(() => {
        tries += 1;
        if (initSwiper() || tries > 40) clearInterval(timer);
      }, 100);
    }

    return () => {
      window.removeEventListener("load", initSwiper);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("vendors:ready", onVendors);
      if (swiperRef.current) {
        try {
          swiperRef.current.destroy(true, true);
        } catch (_) {}
        swiperRef.current = null;
      }
    };
  }, []);

  // ✅ Update layout if slides change
  useEffect(() => {
    try { swiperRef.current?.update?.(); } catch {}
  }, [slides.length]);

  return (
    <section className="hero-ms pb-0">
      <div className="container intro-wrap">
        <div className="swiper shoe-carousel">
          <div className="swiper-wrapper">
            {slides.map((s, idx) => (
              <div key={s.product.id + idx} className="swiper-slide">
                <IntroProductCard
                  badge={s.badge}
                  product={s.product}
                  onBuy={(p) => navigate(`/product/${p.id}`)}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
