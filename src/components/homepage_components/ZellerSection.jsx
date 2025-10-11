// export default function ZellerSection() {
//   return (
//     <div className="zeller_section">
//       <div className="zeller_bg" id="zellerBg"></div>
//       <div className="zeller_overlay" id="zellerOverlay"></div>

//       <div className="zeller_content">
//         <h1 className="fade-up">The Future of Footwear</h1>
//         <p className="fade-up">
//           Step into innovation. Designed for comfort, performance, and individuality.
//         </p>

//         <div className="zeller_cards">
//           <div className="zeller_card fade-up">
//             <img src="/assets/imgs/shoes/s1.png" alt="Card 1" />
//             <h3>Design X</h3>
//             <p>Bold and functional</p>
//           </div>
//           <div className="zeller_card fade-up">
//             <img src="/assets/imgs/shoes/s1.png" alt="Card 2" />
//             <h3>Runner</h3>
//             <p>Speed meets comfort</p>
//           </div>
//           <div className="zeller_card fade-up">
//             <img src="/assets/imgs/shoes/s1.png" alt="Card 3" />
//             <h3>Urban Grid</h3>
//             <p>Built for city steps</p>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
import React, { useEffect, useState } from "react";
import "./HeroSectionV2.css";
import { Link } from "react-router-dom";

export default function ZellerSection({ bgImage }) {
  const [videoSrc, setVideoSrc] = useState("/assets/imgs/banner/faqupdesk.mp4");

  useEffect(() => {
    const updateVideoSource = () => {
      if (window.innerWidth <= 768) {
        setVideoSrc("/assets/imgs/banner/faqupmob.mp4");
      } else {
        setVideoSrc("/assets/imgs/banner/faqupdesk.mp4");
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
