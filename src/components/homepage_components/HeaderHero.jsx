import { useEffect, useRef } from "react";

export default function HeaderHero() {
  const headerRef = useRef(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    // Normalize asset URLs to absolute to work on nested routes
    const bgImgAttr = el.getAttribute("data-background");
    const bgVidAttr = el.getAttribute("data-background-video");

    const toAbs = (p) => (p ? (p.startsWith("/") ? p : "/" + p.replace(/^\.\/?/, "")) : p);
    const bgImg = toAbs(bgImgAttr);
    const bgVid = toAbs(bgVidAttr);
    if (bgImg && bgImg !== bgImgAttr) el.setAttribute("data-background", bgImg);
    if (bgVid && bgVid !== bgVidAttr) el.setAttribute("data-background-video", bgVid);

    // If a background video is desired, ensure it exists (router nav won't rerun legacy init)
    if (bgVid) {
      // Avoid duplicates if legacy script already injected
      let vid = el.querySelector('video[data-hero-bg="1"]');
      if (!vid) {
        vid = document.createElement("video");
        vid.setAttribute("data-hero-bg", "1");
        vid.src = bgVid;
        vid.autoplay = true;
        vid.muted = true;
        vid.loop = true;
        vid.playsInline = true;
        Object.assign(vid.style, {
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: -1,
        });
        // Ensure stacking context
        const cs = window.getComputedStyle(el);
        if (cs.position === "static") {
          el.style.position = "relative";
        }
        el.prepend(vid);
      } else {
        // Ensure src is absolute in case of client navigation
        if (vid.src && !vid.src.includes(bgVid)) {
          vid.src = bgVid;
        }
      }
    } else if (bgImg) {
      el.style.backgroundImage = `url(${bgImg})`;
    }
  }, []);

  return (
    <header
      ref={headerRef}
      className="header-ms bg-img"
      data-background="/assets/imgs/header/bg.jpg"
      data-background-video="/assets/imgs/banner/bannervid.mp4"
      data-overlay-dark="4"
    >
      <div className="container">
        <div className="row">
          <div className="col-lg-9">
            <div className="caption"style={{paddingBottom:"150px"}}>
              <h1 className="hero-title">
                We Create <br />
                <span className="arrow">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M21 3V16.4751H19.5083V5.53591L4.0442 21L3 19.9061L18.4144 4.49171H7.47514V3H21Z" fill="#000"></path>
                  </svg>
                </span>{" "}
                <span className="italic">T</span>he<span className="fw-200">bold step For every journey </span>
              </h1>
              <p className="mb-30"></p>
            </div>
          </div>
          <div className="col-lg-3">{/* award box intentionally left commented */}</div>
        </div>
      </div>
    </header>
  );
}
