
import React, { useEffect, useState } from "react";
import "./HeroSectionV2.css";
import { Link } from "react-router-dom";

export default function ZellerSection({ bgImage }) {
  const [videoSrc, setVideoSrc] = useState("/assets/imgs/banner/faqupdesk.webm");

  useEffect(() => {
    const updateVideoSource = () => {
      if (window.innerWidth <= 768) {
        setVideoSrc("/assets/imgs/banner/faqupmob.webm");
      } else {
        setVideoSrc("/assets/imgs/banner/faqupdesk.webm");
      }
    };

    updateVideoSource(); // Run immediately
    window.addEventListener("resize", updateVideoSource); // Update on resize

    return () => window.removeEventListener("resize", updateVideoSource);
  }, []);

  return (
    <>
      {/* ✅ HERO SECTION */}
      <section
        className="hero-v2-wrapper"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="hero-v2-content">
          <h1 className="hero-v2-title">
            THE FUTURE <br />
            <span className="script-word">Of</span> FOOTWEAR
          </h1>

          <ul className="hero-v2-features">
            <li>- LUXURIOUS COMFORT</li>
            <li>- SOPHISTICATED</li>
            <li>- PRIME CRAFTSMANSHIP</li>
          </ul>

          <h3 className="explore-text">EXPLORE NOW</h3>

          <div className="hero-v2-buttons">
            <Link to="/shop?g=men">
              <button className="hero-btn">MEN</button>
            </Link>
            <Link to="/shop?g=women">
              <button className="hero-btn">WOMEN</button>
            </Link>
          </div>
        </div>
      </section>

      {/* 🎥 ✅ FULL-WIDTH RESPONSIVE VIDEO SECTION */}
      <div className="full-video-wrapper">
        <video
          src={videoSrc}
          autoPlay
          loop
          muted
          playsInline
          className="faq-video"
        />
      </div>
    </>
  );
}
