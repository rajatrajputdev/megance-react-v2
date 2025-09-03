import HeaderHero from "../components/homepage_components/HeaderHero.jsx";
import Intro from "../components/homepage_components/Intro.jsx";
import USP from "../components/homepage_components/USP.jsx";
import Marquee from "../components/homepage_components/Marquee.jsx";
import ZellerSection from "../components/homepage_components/ZellerSection.jsx";
import GalleryYellow from "../components/homepage_components/GalleryYellow.jsx";
import Testimonials from "../components/homepage_components/Testimonials.jsx";
import FAQ from "../components/homepage_components/FAQ.jsx";
import Newsletter from "../components/homepage_components/Newsletter.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import { products } from "../data/products.js";
import SEO from "../components/general_components/SEO.jsx";
import { useCart } from "../context/CartContext.jsx";
import { Link } from "react-router-dom";

export default function Home() {
  const { addItem } = useCart();
  return (
    <>
      <SEO title="Home" description="Elevate every turn with bold, sleek footwear engineered for comfort and performance." image="/assets/logo.svg" type="website" twitterCard="summary" />
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
