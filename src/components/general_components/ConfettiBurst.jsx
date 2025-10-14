import { useEffect, useMemo, useState } from "react";
import "./confetti.css";

// Lightweight confetti burst: fixed overlay, auto-cleans after animation.
export default function ConfettiBurst({ triggerKey, count = 50, duration = 2200 }) {
  const [active, setActive] = useState(false);
  const pieces = useMemo(() => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: Math.random() * 100, // % across viewport
      size: 6 + Math.floor(Math.random() * 8),
      hue: Math.floor(Math.random() * 360),
      rotate: Math.floor(Math.random() * 360),
      delay: Math.floor(Math.random() * 160),
      fall: duration - Math.floor(Math.random() * 300),
    }));
  }, [triggerKey, count, duration]);

  useEffect(() => {
    if (triggerKey == null) return;
    // Trigger a short-lived burst
    setActive(true);
    const t = setTimeout(() => setActive(false), duration + 250);
    return () => clearTimeout(t);
  }, [triggerKey, duration]);

  if (!active) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {pieces.map((p) => (
        <span
          key={`${triggerKey}-${p.id}`}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: `${p.size}px`,
            height: `${Math.round(p.size * 1.6)}px`,
            backgroundColor: `hsl(${p.hue} 90% 55%)`,
            transform: `translate3d(0,-20px,0) rotate(${p.rotate}deg)`,
            animationDuration: `${p.fall}ms, 900ms`,
            animationDelay: `${p.delay}ms, 0ms`,
          }}
        />
      ))}
    </div>
  );
}
