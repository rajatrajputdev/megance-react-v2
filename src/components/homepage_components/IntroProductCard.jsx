import { useState } from "react";
import "./intro-card.css";

export default function IntroProductCard({ badge, product, onBuy }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`intro-card${hovered ? " is-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {badge ? <div className="intro-card__badge">{badge}</div> : null}

      <div className="intro-card__media" aria-hidden>
        <img
          className="intro-card__img intro-card__img--front"
          src={product.image}
          alt=""
        />
        <img
          className="intro-card__img intro-card__img--hover"
          src={product.hover}
          alt=""
        />
      </div>

      <div className="intro-card__body">
        <div className="intro-card__name">{product.name}</div>
        <div className="intro-card__price">₹ {product.price}</div>
      </div>

      <button
        type="button"
        className="intro-card__cta"
        title="Buy now"
        onClick={() => onBuy?.(product)}
      >
        <span className="intro-card__cta-text">Buy Now</span>
        <svg className="intro-card__cta-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
          <path fill="currentColor" d="M21 3v13.475h-1.492V5.536L4.044 21 3 19.906 18.414 4.492H7.475V3H21z"/>
        </svg>
      </button>
    </div>
  );
}

