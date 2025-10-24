 import { useEffect, useRef } from "react";

export default function HeaderHero() {
  const headerRef = useRef(null);

  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;

    const toAbs = (p) =>
      p ? (p.startsWith("/") ? p : "/" + p.replace(/^\.\/?/, "")) : p;

    const isMobile = window.innerWidth <= 768;
    const bgVid = toAbs(
      isMobile
        ? "/assets/imgs/banner/bannervidmob.webm"
        : "/assets/imgs/banner/bannervid.webm"
    );

    el.style.backgroundImage = "none";

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
        objectPosition: "center center",
        zIndex: 0,
      });
      if (window.getComputedStyle(el).position === "static") {
        el.style.position = "relative";
      }
      el.insertBefore(vid, el.firstChild);
    } else if (!vid.src.includes(bgVid)) {
      vid.src = bgVid;
    }
  }, []);

  return (
    <header
      ref={headerRef}
      className="header-ms"
      style={{
        height: "90vh",
        position: "relative",
      }}
    >
      <div
        className="container"
        style={{
          position: "relative",
          zIndex: 1,
          color: "#fff",
          height: "100%",
          display: "flex",
          alignItems: "flex-end",
          paddingBottom: "150px",
        }}
      >
        <div className="row w-full">
          <div className="col-lg-9">
            <h1 className="hero-title">
              <span className="italic"></span>
              <span className="fw-200"></span>
            </h1>
          </div>
        </div>
      </div>
    </header>
  );
}