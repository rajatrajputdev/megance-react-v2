import { Link } from "react-router-dom";
import "./logo.css";

export default function Logo({ adaptive = true, width = 150, height = 40, isScrolled }) {
  // Use previous Megance PNG logo (non-SVG)
  const src = isScrolled ? "/assets/imgs/megance_logo_b.svg" : "/assets/imgs/megance_logo_w.png";
  const alt = "Megance Logo";

  return (
    <Link className="logo-wrapper" to="/">
      <img
        className={`logo-img ${adaptive ? "adaptive" : ""}`}
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ height: "auto" }}
      />
    </Link>
  );
}
