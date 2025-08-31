import { useParams, Link } from "react-router-dom";
import { getProductById } from "../data/products.js";
import { useCart } from "../context/CartContext.jsx";
import { useState } from "react";

export default function ProductPage() {
  const { id } = useParams();
  const product = getProductById(id);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);

  if (!product) {
    return (
      <section className="container pt-60 pb-60">
        <h3>Product not found</h3>
        <Link to="/shop" className="butn mt-20">Back to Shop</Link>
      </section>
    );
  }

  return (
    <section className="container page-section">
      <div className="row">
        <div className="col-md-6 mb-20">
          <img src={product.image} alt={product.name} className="img-fluid" />
        </div>
        <div className="col-md-6">
          <h2 className="section-title">{product.name}</h2>
          <div className="h4 mt-10">₹ {product.price}</div>
          <p className="mt-20">{product.description}</p>
          <div className="d-flex align-items-center mt-20">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, parseInt(e.target.value || 1)))}
              style={{ width: 80, marginRight: 10 }}
            />
            <button className="butn butn-md butn-rounded" onClick={() => addItem(product, qty)}>
              Add to Cart
            </button>
          </div>
          <div className="mt-20">
            <Link to="/cart" className="underline">Go to cart</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
