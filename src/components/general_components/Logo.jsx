import { Link } from "react-router-dom";

export default function Logo() {
  // Use previous Megance PNG logo (non-SVG)
  const src = "/assets/imgs/megance_logo_b.png";
  const alt = "Megance Logo";

  return (
    <Link className="logo-wrapper" to="/">
      <img src={src} alt={alt} width={150} height={40} style={{ height: "auto" }} />
    </Link>
  );
}
