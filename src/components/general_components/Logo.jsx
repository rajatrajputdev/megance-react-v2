import { Link } from "react-router-dom";
import "./logo.css";

export default function Logo({ adaptive = true, width = 150, height = 40 }) {
  // Use previous Megance PNG logo (non-SVG)
  const src = "/assets/imgs/megance_logo_b.svg";
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
