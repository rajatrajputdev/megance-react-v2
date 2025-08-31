import { products } from "../data/products.js";
import { useCart } from "../context/CartContext.jsx";
import { Link } from "react-router-dom";

export default function Shop() {
  const { addItem } = useCart();
  return (
    <section className="container page-section">
      <div className="row mb-40 text-center">
        <div className="col-12">
          <h2 className="section-title">Shop</h2>
          <p className="mt-10 opacity-7">Explore featured products</p>
        </div>
      </div>
      <div className="row">
        {products.map((p) => (
          <div key={p.id} className="col-sm-6 col-md-4 col-lg-3 mb-30">
            <div className="product-card p-15">
              <Link to={`/product/${p.id}`} className="d-block mb-10">
                <img src={p.image} alt={p.name} className="img-fluid" />
              </Link>
              <div className="product-details">
                <div className="name">{p.name}</div>
                <div className="price">₹ {p.price}</div>
              </div>
              <div className="d-flex mt-10">
                <Link to={`/product/${p.id}`} className="butn butn-md butn-rounded mr-10">View</Link>
                <button className="butn butn-md butn-rounded" onClick={() => addItem(p, 1)}>Add</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
