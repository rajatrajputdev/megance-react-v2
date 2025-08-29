import { useEffect } from "react";

export default function Testimonials() {
  useEffect(() => {
    // Initialize Swiper (from CDN) for this block
    const SwiperCtor = window.Swiper;
    if (typeof SwiperCtor === "function") {
      // Avoid multiple inits by checking a data-flag on container
      const container = document.querySelector("#testimonials .testim-swiper");
      if (container && !container.getAttribute("data-initialized")) {
        new SwiperCtor(".testim-sm .testim-swiper", {
          slidesPerView: 3,
          spaceBetween: 30,
          centeredSlides: true,
          loop: true,
          speed: 1500,
          autoplay: { delay: 5000 },
          pagination: {
            el: ".testim-sm .swiper-pagination",
            clickable: true,
          },
          breakpoints: {
            0: { slidesPerView: 1 },
            640: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          },
        });
        container.setAttribute("data-initialized", "true");
      }
    }
  }, []);

  return (
    <section className="testim-sm section-padding" id="testimonials">
      <div className="container">
        <div className="sec-head text-center mb-100">
          <h6 className="sub-title main-color mb-15">Testimonials</h6>
          <h3 className="text-u">What Our Clients Say?</h3>
        </div>
        <div className="swiper testim-swiper swiper-container">
          <div className="swiper-wrapper">
            {[1, 2, 3, 4].map((i) => (
              <div className="swiper-slide" key={i}>
                <div className="item">
                  <div className="mb-70">
                    <div className="info d-flex align-items-center pt-30 mb-15">
                      <div>
                        <div className="img-author">
                          <img src="assets/imgs/testim/avatar1.jpg" alt="" />
                        </div>
                      </div>
                      <div className="info-text">
                        <span>Bradley Gordon</span>
                        <p>CEO & Founder, Archin Studio</p>
                      </div>
                    </div>
                    <h3>“Excellent</h3>
                  </div>
                  <div>
                    <div className="rate">
                      <h5>
                        5.0
                        <span className="stars">
                          <i className="fas fa-star"></i>
                          <i className="fas fa-star"></i>
                          <i className="fas fa-star"></i>
                          <i className="fas fa-star"></i>
                          <i className="fas fa-star"></i>
                        </span>
                      </h5>
                    </div>
                    <div className="mt-15">
                      <h6 className="fz-16">
                        A studio with passionate, professional and full creativity. Much more than I’m expect. Great
                        services, high quality products & affordable prices. I’m extremely satisfied!.
                      </h6>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
