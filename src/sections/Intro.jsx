export default function Intro() {
  return (
    <section className="hero-ms pb-0">
      <div className="">
        {/* top banner cards were commented in original */}
      </div>

      <div className="swiper shoe-carousel">
        <div className="swiper-wrapper">
          <div className="swiper-slide">
            <div className="product-card">
              <div className="badge">BESTSELLER</div>
              <div className="product-image-wrapper">
                <img src="./assets/imgs/shoes/s1.png" className="front-img" alt="Shoe Front" />
                <img src="./assets/imgs/shoes/s2.jpg" className="hover-img" alt="Shoe Hover" />
              </div>
              <div className="product-details">
                <div className="name">Aeon v2 ECLIPSE</div>
                <div className="price">₹ 4499</div>
              </div>
              <div className="add-icon">+</div>
            </div>
          </div>

          <div className="swiper-slide">
            <div className="product-card">
              <div className="badge">TRENDING</div>
              <div className="product-image-wrapper">
                <img src="./assets/imgs/shoes/s1.png" className="front-img" alt="Shoe Front" />
                <img src="./assets/imgs/shoes/s2.jpg" className="hover-img" alt="Shoe Hover" />
              </div>
              <div className="product-details">
                <div className="name">Volt Boost Max</div>
                <div className="price">₹ 3899</div>
              </div>
              <div className="add-icon">+</div>
            </div>
          </div>

          <div className="swiper-slide">
            <div className="product-card">
              <div className="badge">HOT</div>
              <div className="product-image-wrapper">
                <img src="./assets/imgs/shoes/s1.png" className="front-img" alt="Shoe Front" />
                <img src="./assets/imgs/shoes/s2.jpg" className="hover-img" alt="Shoe Hover" />
              </div>
              <div className="product-details">
                <div className="name">Stride Runner Pro</div>
                <div className="price">₹ 3299</div>
              </div>
              <div className="add-icon">+</div>
            </div>
          </div>

          <div className="swiper-slide">
            <div className="product-card">
              <div className="badge">NEW</div>
              <div className="product-image-wrapper">
                <img src="./assets/imgs/shoes/s1.png" className="front-img" alt="Shoe Front" />
                <img src="./assets/imgs/shoes/s2.jpg" className="hover-img" alt="Shoe Hover" />
              </div>
              <div className="product-details">
                <div className="name">Echo Flex Zoom</div>
                <div className="price">₹ 4799</div>
              </div>
              <div className="add-icon">+</div>
            </div>
          </div>

          <div className="swiper-slide">
            <div className="product-card">
              <div className="badge">CLASSIC</div>
              <div className="product-image-wrapper">
                <img src="./assets/imgs/shoes/s1.png" className="front-img" alt="Shoe Front" />
                <img src="./assets/imgs/shoes/s2.jpg" className="hover-img" alt="Shoe Hover" />
              </div>
              <div className="product-details">
                <div className="name">Nimbus Street Pro</div>
                <div className="price">₹ 3999</div>
              </div>
              <div className="add-icon">+</div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <div className="row justify-content-center text-center mb-100">
          <div className="col-lg-11">
            <span className="sub-head mt-30 mb-30">What we offer</span>
            <div className="text-center main-text">
              <h2>
                From creators to athletes, trendsetters to everyday explorers — we walk together, delivering sneakers
                that match every <span className="main-color">path, pace, and personality.</span>
              </h2>
              <div className="img1 fit-img">
                <img src="assets/imgs/intro/1.png" alt="" />
              </div>
              <div className="img2 fit-img">
                <img src="assets/imgs/intro/2.png" alt="" />
              </div>
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
                <video className="shoes_video_3d" src="./assets/imgs/shoes3Dvideo.mp4" muted autoPlay loop></video>
              </div>
              <div className="icon icon-img-100">
                <img src="assets/imgs/intro/4.png" alt="" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

