import { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";

export default function Logo() {
  const { pathname } = useLocation();
  const [useBlack, setUseBlack] = useState(pathname !== "/");

  useEffect(() => {
    // On non-home routes, prefer black logo for contrast
    if (pathname !== "/") {
      setUseBlack(true);
      return;
    }
    // On home, swap based on nav-scroll class or scroll position
    const onScroll = () => {
      const nav = document.querySelector(".navbar");
      const scrolled = window.scrollY > 10 || (nav && nav.classList.contains("nav-scroll"));
      setUseBlack(scrolled);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  const src = useBlack ? "/assets/imgs/megance_logo_b.png" : "/assets/imgs/megance_logo_w.png";
  const alt = "Megance Logo";

  return (
    <Link className="logo-wrapper" to="/">
      <img src={src} alt={alt} width={150} height={40} style={{height: "auto"}} />
    </Link>
  );
}

