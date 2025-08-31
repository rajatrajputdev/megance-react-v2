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

export default function Home() {
  return (
    <>
      <main>
        <HeaderHero />
        <Intro />
        <USP />
        <Marquee />
        <ZellerSection />
        <GalleryYellow />
        <Testimonials />
        <FAQ />
      </main>
      <Newsletter />
      <hr />
      <Footer />
    </>
  );
}
