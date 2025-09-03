import { useEffect, useRef, useState } from "react";
import "../../styles/loader.css";

// Inline the logo paths so we can animate stroke length
const P1 = "M563.91,470.12,243.37,288c-.39,5.82-.85,9.58-.85,13.35q-.08,96,0,192v90H0V44.52c3.48-.18,6.7-.5,9.92-.5,29.32,0,58.65-.15,88,.23,47,.61,93.89,1.54,140.82,2.52a23.54,23.54,0,0,1,10.43,2.54c30.93,16.81,61.71,33.91,92.56,50.86,28.83,15.84,57.73,31.56,86.55,47.41q54.58,30,109.1,60.11c5.81,3.21,11.72,6.27,17.33,9.8,6.06,3.82,11.68,3.63,17.8.11q41.89-24.15,83.95-48,48-27.39,96.12-54.73,87.87-50.1,175.72-100.23c7.21-4.11,14.55-8,21.59-12.4,5.11-3.19,9.64-2.62,15-.42,29.81,12.15,59.8,23.89,89.69,35.87q68.84,27.56,137.61,55.25c6.72,2.7,13.38,5.53,19.54,8.08.46,1,.73,1.27.7,1.54a1.3,1.3,0,0,1-.53.82,60.28,60.28,0,0,1-5.69,4Q885.2,288.71,563.91,470.12Z";
const P2 = "M835.88,583.12V571.64c0-24,.06-48-.12-72-.16-21-.55-41.93-1-62.9-.44-21.61-1-43.23-1.58-65.95l252.16-148.27c0,17.08.06,32.29,0,47.49,0,4-.78,7.95-.82,11.93-.13,16.65-.1,33.31-.17,50-.27,59.29-.44,118.59-.9,177.88-.18,22.93-1,45.86-1.6,68.79a38.42,38.42,0,0,1-.69,4.51Z";

export default function Loader() {
  const [done, setDone] = useState(false);
  const [reveal, setReveal] = useState(false);
  const [anim, setAnim] = useState(false);
  const overlayRef = useRef(null);
  const svgRef = useRef(null);

  useEffect(() => {
    const overlay = overlayRef.current;
    const svg = svgRef.current;
    if (!overlay || !svg) return;

    const paths = Array.from(svg.querySelectorAll('[data-stroke="1"]'));
    // Prime stroke-dash based on actual length
    paths.forEach((p, i) => {
      try {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        p.style.strokeDashoffset = `${len}`;
        p.style.setProperty("--len", `${len}`);
        p.style.setProperty("--delay", `${i * 220}ms`);
      } catch (_) {}
    });

    setAnim(true);

    // When the last path finishes its draw, fade fills and then reveal
    const last = paths[paths.length - 1];
    let t1, t2;
    const onEnd = () => {
      svg.classList.add("is-filled");
      t1 = setTimeout(() => setReveal(true), 600);
    };
    // Fallback in case animationend isn't fired
    t2 = setTimeout(onEnd, 2400 + paths.length * 220);
    last?.addEventListener("animationend", onEnd, { once: true });

    const onSlideEnd = (e) => {
      if (e.animationName === "loader-slide") setDone(true);
    };
    overlay.addEventListener("animationend", onSlideEnd);

    return () => {
      clearTimeout(t1); clearTimeout(t2);
      overlay.removeEventListener("animationend", onSlideEnd);
    };
  }, []);

  if (done) return null;

  return (
    <div
      ref={overlayRef}
      className={`megance-loader${anim ? " is-animating" : ""}${reveal ? " is-revealing" : ""}`}
      aria-hidden
    >
      <div className="ml-center">
        <svg
          ref={svgRef}
          className="logo-stroke"
          viewBox="0 0 1212.44 583.27"
          role="img"
          aria-label="Megance Logo"
        >
          <g>
            {/* Stroke paths to be drawn */}
            <path data-stroke="1" d={P1} />
            <path data-stroke="1" d={P2} />
          </g>
          <g className="fills">
            {/* Fills fade in after stroke draw */}
            <path d={P1} />
            <path d={P2} />
          </g>
        </svg>
      </div>
    </div>
  );
}
