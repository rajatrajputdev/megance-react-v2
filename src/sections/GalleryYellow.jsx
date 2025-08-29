import { useEffect } from "react";

export default function GalleryYellow() {
  useEffect(() => {
    const SwiperCtor = window.Swiper;
    if (typeof SwiperCtor === "function") {
      const container = document.querySelector(".gallery-yellow-swiper");
      if (container && !container.getAttribute("data-initialized")) {
        new SwiperCtor(".gallery-yellow-swiper", {
          slidesPerView: 3,
          spaceBetween: 30,
          centeredSlides: true,
          loop: true,
          speed: 1500,
          autoplay: { delay: 4000 },
          breakpoints: {
            0: { slidesPerView: 2 },
            640: { slidesPerView: 2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 5 },
          },
        });
        container.setAttribute("data-initialized", "true");
      }
    }
  }, []);

  return (
    <section
      className="testim-sm section-padding"
      style={{ backgroundColor: "rgb(231, 237, 18)", paddingBottom: 100 }}
    >
      <div className="container">
        <div className="sec-head text-center mb-100">
          <h6 className="sub-title main-color mb-15">Gallery</h6>
          <h3 className="text-u">Our Shoes on Feets</h3>
        </div>
        <div className="swiper testim-swiper gallery-yellow-swiper swiper-container">
          <div className="swiper-wrapper">
            {[1, 2, 3, 4, 5].map((i) => (
              <div className="swiper-slide" key={i}>
                <div className="item">
                  <img src="./assets/imgs/shoes/s1.png" alt="" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
