import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  return (
    <div className="swiper-slide">
      <div className="product-card">
        <div className="badge">NEW</div>
        <div className="product-image-wrapper">
          <Link to={`/product/${product.id}`}>
            <img src={product.image} className="front-img" alt={product.name} />
            <img src={product.hover} className="hover-img" alt={`${product.name} hover`} />
          </Link>
        </div>
        <div className="product-details">
          <div className="name">{product.name}</div>
          <div className="price">₹ {product.price}</div>
        </div>
        <button className="add-icon" onClick={() => addItem(product, 1)} title="Add to Cart">
          +
        </button>
      </div>
    </div>
  );
}

