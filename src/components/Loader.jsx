import { useEffect, useMemo, useRef, useState } from "react";
import "../styles/loader.css";

export default function Loader() {
  const BRAND = "Megance";
  const [done, setDone] = useState(false);
  const [anim, setAnim] = useState(false);
  const [reveal, setReveal] = useState(false);
  const overlayRef = useRef(null);

  // Generate stable random offsets per letter once
  const letters = useMemo(() => {
    const rand = (min, max) => Math.random() * (max - min) + min;
    const items = BRAND.split("").map((ch, i) => {
      const tx = rand(-90, 90).toFixed(1) + "px";
      const ty = rand(-70, 70).toFixed(1) + "px";
      const rot = rand(-40, 40).toFixed(1) + "deg";
      const blur = rand(0.5, 3.5).toFixed(1) + "px";
      const scale = rand(0.85, 1.15).toFixed(2);
      const d = Math.round(i * 95 + rand(0, 140)) + "ms"; // staggered delay
      const t = Math.round(rand(900, 1400)) + "ms"; // varied duration
      return { ch, style: { "--tx": tx, "--ty": ty, "--rot": rot, "--blur": blur, "--scale": scale, "--d": d, "--t": t } };
    });
    return items;
  }, []);

  useEffect(() => {
    const el = overlayRef.current;
    if (!el) return;

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setAnim(true);

      // Compute when the last letter should be settled, then trigger reveal
      const parseMs = (v) => (typeof v === "string" && v.endsWith("ms") ? parseInt(v) : 0);
      let maxEnd = 0;
      letters.forEach((l) => {
        const end = parseMs(l.style["--d"]) + parseMs(l.style["--t"]);
        if (end > maxEnd) maxEnd = end;
      });
      const revealDelay = Math.min(6000, maxEnd + 350); // cap to avoid extreme waits
      const r = setTimeout(() => setReveal(true), revealDelay);
      timeouts.push(r);
    };

    // Wait for fonts or fallback; then start
    const timeouts = [];
    const f = setTimeout(start, 300);
    timeouts.push(f);
    (async () => {
      try {
        if (document.fonts && document.fonts.ready) {
          await document.fonts.ready;
          start();
        }
      } catch (_) {
        // ignore
      }
    })();

    const onAnimEnd = (e) => {
      if (e.animationName === "loader-slide") setDone(true);
    };
    el.addEventListener("animationend", onAnimEnd);
    const safety = setTimeout(() => setDone(true), 10000);
    timeouts.push(safety);

    return () => {
      el.removeEventListener("animationend", onAnimEnd);
      timeouts.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [letters]);

  if (done) return null;

  return (
    <div
      ref={overlayRef}
      className={`megance-loader${anim ? " is-animating" : ""}${reveal ? " is-revealing" : ""}`}
      aria-hidden
    >
      <div className="ml-center">
        <div className="brand-word" aria-label={BRAND}>
          {letters.map((l, idx) => (
            <span key={idx} className="letter" style={l.style}>
              {l.ch}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
