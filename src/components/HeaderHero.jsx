import { useEffect, useRef } from "react";

export default function HeaderHero() {
  const headerRef = useRef(null);

  useEffect(() => {
    // Ensure data-background and data-background-video are present for legacy scripts
    const el = headerRef.current;
    if (!el) return;
    // Nothing else here; common_scripts.js handles background video/image
  }, []);

  return (
    <header
      ref={headerRef}
      className="header-ms bg-img"
      data-background="assets/imgs/header/bg.jpg"
      data-background-video="assets/imgs/banner/bannervid.mp4"
      data-overlay-dark="4"
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-9">
            <div className="caption mb-100">
              <h1>
                We Create <br />
                <span className="arrow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 3V16.4751H19.5083V5.53591L4.0442 21L3 19.9061L18.4144 4.49171H7.47514V3H21Z" fill="#000"></path>
                  </svg>
                </span>{" "}
                <span className="italic">T</span>he<span className="fw-200">bold step For every journey </span>
              </h1>
              <p className="mt-30"></p>
            </div>
          </div>
          <div className="col-lg-3">{/* award box intentionally left commented */}</div>
        </div>
        <div className="row">
          <div className="col-lg-4">
            <div className="vid-box mb-40">
              <video autoPlay muted disablePictureInPicture controlsList="nodownload"></video>
            </div>
          </div>
          <div className="col-lg-7 offset-lg-1">
            <div className="feat row justify-content-between">
              <div className="col-md-5"></div>
              <div className="col-md-5"></div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}

