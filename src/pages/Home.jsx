import HeaderHero from "../components/HeaderHero.jsx";
import Intro from "../sections/Intro.jsx";
import USP from "../sections/USP.jsx";
import Marquee from "../sections/Marquee.jsx";
import ZellerSection from "../sections/ZellerSection.jsx";
import GalleryYellow from "../sections/GalleryYellow.jsx";
import Testimonials from "../sections/Testimonials.jsx";
import FAQ from "../sections/FAQ.jsx";
import Newsletter from "../sections/Newsletter.jsx";
import Footer from "../sections/Footer.jsx";
import { products } from "../data/products.js";
import { useCart } from "../context/CartContext.jsx";
import { Link } from "react-router-dom";

export default function Home() {
  const { addItem } = useCart();
  return (
    <>
      <main>
        <HeaderHero />
        <Intro />
        <USP />
        <Marquee />
        <ZellerSection />
        <GalleryYellow />
        {/* Featured products with Add to Cart */}
        <section className="container page-section">
          <div className="row mb-30 text-center">
            <div className="col-12">
              <h3 className="section-title">Featured Products</h3>
              <p className="mt-10 opacity-7">Add your favourites to the cart</p>
            </div>
          </div>
          <div className="row">
            {products.slice(0, 4).map((p) => (
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
        <Testimonials />
        <FAQ />
      </main>
      <Newsletter />
      <hr />
      <Footer />
    </>
  );
}
