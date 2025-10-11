
    import React from "react";
import "./HeroSection.css";
import { Link } from "react-router-dom";
export default function Marquee({ bgImage }) {
  return (
    <> 
    <section
      className="hero-wrapper mt-25"
      style={{ backgroundImage: `url(${bgImage})` }} // ✅ Dynamic Background
    >
      <div className="hero-content">
        <h1 className="hero-title">JOIN THE <br /> LIFESTYLE</h1>
        <div className="hero-buttons">
          <Link to="/shop?g=men">
           <button  className="hero-btn">MEN</button>
          </Link>
          <Link to="/shop?g=women">
          <button className="hero-btn">WOMEN</button>
          </Link>
        </div>
      </div>
    </section>

    <section className="">
      <div className="marquee-container">
        <div className="marquee-content">
          <span>• Experience Megance &nbsp;&nbsp;&nbsp;</span>
          <span>• Experience Megance &nbsp;&nbsp;&nbsp;</span>
          <span>• Experience Megance &nbsp;&nbsp;&nbsp;</span>
          <span>• Experience Megance &nbsp;&nbsp;&nbsp;</span>
          <span>• Experience Megance &nbsp;&nbsp;&nbsp;</span>
          <span>• Embrace your lifestyle &nbsp;&nbsp;&nbsp;</span>
          <span>• Embrace your lifestyle &nbsp;&nbsp;&nbsp;</span>
          <span>• Embrace your lifestyle &nbsp;&nbsp;&nbsp;</span>
          <span>• Embrace your lifestyle &nbsp;&nbsp;&nbsp;</span>
          <span>• Embrace your lifestyle &nbsp;&nbsp;&nbsp;</span>
        </div>
      </div>
    </section>
    </>
  );
}