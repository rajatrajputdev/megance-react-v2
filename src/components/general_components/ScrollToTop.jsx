import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: "auto", // or "auto" if you want instant scroll
    });
  }, [pathname]); // runs every time route changes

  return null; // this component doesn’t render anything
};

export default ScrollToTop;
