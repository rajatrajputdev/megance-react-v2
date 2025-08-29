import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import HeaderHero from "./components/HeaderHero.jsx";
import Intro from "./sections/Intro.jsx";
import Marquee from "./sections/Marquee.jsx";
import ZellerSection from "./sections/ZellerSection.jsx";
import GalleryYellow from "./sections/GalleryYellow.jsx";
import FAQ from "./sections/FAQ.jsx";
import Newsletter from "./sections/Newsletter.jsx";
import Footer from "./sections/Footer.jsx";
import USP from "./sections/USP.jsx";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}

// Support an optional testimonials root if present (multi-root mount)
const testimEl = document.getElementById("root-testimonials");
if (testimEl) {
  // Lazy component to keep bundles small
  const Testimonials = React.lazy(() => import("./sections/Testimonials.jsx"));
  createRoot(testimEl).render(
    <React.Suspense fallback={null}>
      <Testimonials />
    </React.Suspense>
  );
}

// Mount HeaderHero into its placeholder within the smooth wrapper
const headerEl = document.getElementById("root-header");
if (headerEl) {
  createRoot(headerEl).render(<HeaderHero />);
}

const introEl = document.getElementById("root-intro");
if (introEl) {
  createRoot(introEl).render(<Intro />);
}

const marqueeEl = document.getElementById("root-marquee");
if (marqueeEl) {
  createRoot(marqueeEl).render(<Marquee />);
}

const zellerEl = document.getElementById("root-zeller");
if (zellerEl) {
  createRoot(zellerEl).render(<ZellerSection />);
}

const galleryEl = document.getElementById("root-gallery");
if (galleryEl) {
  createRoot(galleryEl).render(<GalleryYellow />);
}

const faqEl = document.getElementById("root-faq");
if (faqEl) {
  createRoot(faqEl).render(<FAQ />);
}

const newsletterEl = document.getElementById("root-newsletter");
if (newsletterEl) {
  createRoot(newsletterEl).render(<Newsletter />);
}

const footerEl = document.getElementById("root-footer");
if (footerEl) {
  createRoot(footerEl).render(<Footer />);
}

const uspEl = document.getElementById("root-usp");
if (uspEl) {
  createRoot(uspEl).render(<USP />);
}
