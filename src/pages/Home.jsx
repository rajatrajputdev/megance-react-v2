import HeaderHero from "../components/homepage_components/HeaderHero.jsx";
import Intro from "../components/homepage_components/Intro.jsx";
import USP from "../components/homepage_components/USP.jsx";
import Marquee from "../components/homepage_components/Marquee.jsx";
import ZellerSection from "../components/homepage_components/ZellerSection.jsx";
import GalleryYellow from "../components/homepage_components/GalleryYellow.jsx";
import Testimonials from "../components/homepage_components/Testimonials.jsx";
import FAQ2 from "../components/homepage_components/FAQ2.jsx";
import Newsletter from "../components/homepage_components/Newsletter.jsx";
import Footer from "../components/homepage_components/Footer.jsx";
import SEO from "../components/general_components/SEO.jsx";

export default function Home() {
  return (
    <>
      <SEO title="Home" description="Elevate every turn with bold, sleek footwear engineered for comfort and performance." image="/assets/logo.svg" type="website" twitterCard="summary" />
      <main>
        <HeaderHero />
        <Intro />
        <USP />
        <Marquee bgImage="/assets/imgs/banner/home2.webp" />
        <ZellerSection bgImage="/assets/imgs/banner/home.webp" />
       <FAQ2 />
      </main>
      
      <hr />
      <Footer />
    </>
  );
}
