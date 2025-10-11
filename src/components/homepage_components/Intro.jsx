import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import IntroProductCard from "./IntroProductCard.jsx";
import { fetchProductsByCategoryName, fetchProductsByTag } from "../../services/products.js";
import "./intro.css";

export default function Intro() {
  const swiperRef = useRef(null);
  const navigate = useNavigate();

  const [slides, setSlides] = useState([]);
  // Load featured items for homepage: trending, new-arrival, bestseller, featured
  useEffect(() => {
    let canceled = false;
    const fetchOne = async (label) => {
      let list = await fetchProductsByCategoryName(label, { visibleOnly: true, limit: 1 });
      if (!Array.isArray(list) || list.length === 0) {
        list = await fetchProductsByTag(label, { visibleOnly: true, limit: 1 });
      }
      return Array.isArray(list) && list[0] ? list[0] : null;
    };
    (async () => {
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
    })();
    return () => { canceled = true; };
  }, []);

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
        slidesPerView: isMobile ? 1 : 4,
        loop: isMobile,
        autoplay: isMobile
          ? { delay: 2500, disableOnInteraction: false }
          : false,
        speed: 600,
        breakpoints: {
          320: { slidesPerView: 1 },
          576: { slidesPerView: 2 },
          768: { slidesPerView: 3 },
          1024: { slidesPerView: 4 },
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
    // Try immediately; if not ready, poll briefly until Swiper loads
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

  // Update swiper layout if slides change after initial mount
  useEffect(() => {
    try { swiperRef.current?.update?.(); } catch {}
  }, [slides.length]);
  return (
    <section className="hero-ms pb-0">
      <div className=""></div>

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

      <div className="container">
        <div className="row justify-content-center text-center mb-100">
          <div className="col-lg-11">
            {/* <span className="sub-head mt-30 mb-30">What we offer</span> */}
            <div className="text-center main-text">
              {/* <h2>
                From creators to athletes, trendsetters to everyday explorers — we walk together, delivering sneakers
                that match every <span className="main-color">path, pace, and personality.</span>
              </h2> */}
              {/* <div className="img1 fit-img">
                <img src="/assets/imgs/intro/1.png" alt="" />
              </div>
              <div className="img2 fit-img">
                <img src="/assets/imgs/intro/2.png" alt="" />
              </div> */}
            </div>
          </div>
        </div>
        <div className="row align-items-center  mob_only">
          <div className="col-lg-7">
            <div className="qoutes d-flex">
              <div>
                <div className="icon-img-80">
                  <img src="/common/imgs/icons/quote-right-solid.svg" alt="" className="full-width" />
                </div>
              </div>
              <div className="text ml-40">
                <h1 className="words_3d">Elevate</h1>
                <h1 className="words_3d space_dec">Your</h1>
                <h1 className="words_3d space_dec">Every</h1>
                <h1 className="words_3d_special">Turn</h1>
                <div className="mt-40 d-flex align-items-center"></div>
              </div>
            </div>
          </div>
          <div className="col-lg-5">
            <div className="exp">
              <div className="text-right">
                <video className="shoes_video_3d" src="/assets/imgs/shoes3Dvideo.mp4" muted autoPlay loop></video>
              </div>
              <div className="icon icon-img-100">
                <img src="/assets/imgs/intro/4.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
