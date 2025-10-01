import { Link } from "react-router-dom";
import "./logo.css";

export default function Logo({ width = 150, height = 40 }) {
  // Always use the black logo for white navbar background
  const src = "/assets/imgs/megance_logo_b.svg";
  const alt = "Megance Logo";

  return (
    <Link className="logo-wrapper" to="/">
      <img
        className="logo-img"
        src={src}
        alt={alt}
        width={width}
        height={height}
        style={{ height: "auto" }}
      />
    </Link>
  );
}
