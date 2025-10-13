import { useMemo, useState } from "react";
import "./intro-card.css";

export default function IntroProductCard({ badge, product, onBuy }) {
  const [hovered, setHovered] = useState(false);

  // Resolve primary & hover image from backend data
  const { frontImg, hoverImg } = useMemo(() => {
    const main = product?.image || product?.images?.[0] || product?.gallery?.[0] || "";
    const secondary =
      product?.hover ||
      product?.images?.[1] ||
      product?.gallery?.[1] ||
      product?.altImage ||
      main;
    return { frontImg: main, hoverImg: secondary };
  }, [product]);

  return (
    <div
      className={`intro-card-flat${hovered ? " is-hovered" : ""}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="intro-media-flat">
        {/* Badge sits on the image top-left like your reference */}
        {badge ? <div className="intro-badge-flat">{badge}</div> : null}

        <img className="img-front" src={frontImg} alt={product?.name || "Sneaker"} />
        <img className="img-hover" src={hoverImg} alt={product?.name || "Sneaker Alt"} />
      </div>

      <div className="intro-text-block">
        <div className="intro-name-flat">{product?.name}</div>
        <div className="intro-price-flat">₹ {product?.price}</div>
      </div>

      <button
        type="button"
        className="intro-buy-btn-flat"
        onClick={() => onBuy?.(product)}
      >
        Buy Now
      </button>
    </div>
  );
}
