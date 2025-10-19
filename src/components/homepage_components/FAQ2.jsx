import { useState, useRef, useCallback, useLayoutEffect } from "react";
import "./faq2.css";

/**
 * Smooth, scroll-stable FAQ (FLIP technique)
 * - Measures item position before toggle
 * - Toggles open state
 * - Measures after and scrolls by the exact delta so the item visually doesn't move
 * - Animates the panel height without causing page jumps
 */
export default function FAQ2({ items, title = "FAQs", subtitle }) {
  const [openIndex, setOpenIndex] = useState(null);
  const itemRefs = useRef([]);          // refs to .faq2-item
  const panelRefs = useRef([]);         // refs to .faq2-collapse

  // Default data
  const data = items || [
    ["What makes Megance suede sneakers different from regular sneakers?", "Megance uses premium suede material, stitched and finished for a luxury look, unlike mass-market sneakers. Each pair goes through detailed quality checks and is crafted in India, with a focus on comfort, design aesthetics, and long-term durability."],
    ["How much do Megance suede sneakers cost, including delivery and taxes?", "All Megance infinity collection sneakers are priced at ₹5,450, inclusive of GST, delivery, and handling charges. There are no hidden fees or extra shipping costs at checkout."],
    ["Do you offer Cash on Delivery (COD) for sneakers in India?", "Yes, Megance offers COD across most Indian pin codes. However, customers with repeated COD refusals may be shifted to prepaid-only eligibility to reduce RTO and logistics waste."],
    ["How long does delivery take for Megance sneakers?", "Once shipped, delivery for Megance sneakers typically takes 3–7 working days, depending on your location."],
    ["How do I know my sneaker size before ordering?", "We provide a detailed sneaker size chart for India on our website to help you select your perfect fit. Megance sneakers follow true-to-size measurements similar to Nike, Puma, and Adidas Originals sneaker sizing."],
    ["How do I care for my suede sneakers to keep them looking new?", "To maintain your premium suede sneakers, avoid harsh cleaning chemicals and use a soft suede brush or suede cleaning spray. Keep them away from moisture to preserve the texture and rich suede finish."],
    ["Are Megance sneakers unisex?", "Yes, Megance suede sneakers are designed to be gender-neutral. Both male and female sneaker enthusiasts can style the Infinity Collection colorways effortlessly."],
    ["What is the best way to style Megance suede sneakers?", "Megance sneakers are crafted for minimal streetwear styling. Pair them with neutral fits, oversized tees, monotone sets, or layered winter outfits for a clean luxury aesthetic."],
  ];

  // Utility: animate a panel’s height from current to target without layout jumps
  const animatePanelHeight = (panel, expand) => {
    if (!panel) return;

    // Measure current height
    const start = panel.getBoundingClientRect().height;

    // Set to auto to measure target height
    panel.style.height = "auto";
    const target = panel.getBoundingClientRect().height;

    // If collapsing, swap start/target
    const from = expand ? start : start; // start is current
    const to = expand ? target : 0;

    // Start from explicit current height
    panel.style.height = `${from}px`;
    panel.style.overflow = "hidden";

    // Force reflow then animate to target
    // eslint-disable-next-line no-unused-expressions
    panel.offsetHeight; 
    panel.style.transition = "height 0.35s cubic-bezier(.25,.8,.25,1)";
    panel.style.height = `${to}px`;

    const cleanup = () => {
      panel.style.transition = "";
      panel.style.overflow = "";
      // After expand, let height be auto; after collapse, keep at 0
      if (expand) {
        panel.style.height = "auto";
      } else {
        panel.style.height = "0px";
      }
      panel.removeEventListener("transitionend", cleanup);
    };

    panel.addEventListener("transitionend", cleanup);
  };

  const toggle = useCallback((index) => {
    const itemEl = itemRefs.current[index];
    const panelEl = panelRefs.current[index];
    if (!itemEl || !panelEl) {
      setOpenIndex((prev) => (prev === index ? null : index));
      return;
    }

    // 1) Measure BEFORE
    const beforeTop = itemEl.getBoundingClientRect().top;
    // Snapshot scroll position BEFORE any DOM changes
    let preScrollY = 0;
    try {
      if (typeof window !== 'undefined' && window.ScrollSmoother && window.ScrollSmoother.get) {
        const sm = window.ScrollSmoother.get();
        if (sm && typeof sm.scrollTop === 'function') preScrollY = sm.scrollTop();
        else preScrollY = window.scrollY || window.pageYOffset || 0;
      } else {
        preScrollY = window.scrollY || window.pageYOffset || 0;
      }
    } catch { preScrollY = 0; }

    // 2) Compute next state and animate the panel
    const willOpen = openIndex !== index;

    // Animate the current panel height (independent of state re-render)
    animatePanelHeight(panelEl, willOpen);

    // 3) Toggle state (this will add/remove 'is-open' class)
    setOpenIndex((prev) => (prev === index ? null : index));

    // 4) In next layout frame(s), measure AFTER and compensate scroll by delta
    // Use two rAFs to ensure DOM updates are committed
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const afterTop = itemEl.getBoundingClientRect().top;
        const delta = afterTop - beforeTop;
        if (delta !== 0) {
          // Prefer GSAP ScrollSmoother correction to avoid any transform jump
          const smoother = (typeof window !== 'undefined' && window.ScrollSmoother && window.ScrollSmoother.get)
            ? window.ScrollSmoother.get()
            : null;
          const correctTo = (offset) => {
            withInstantScroll(() => {
              if (smoother && typeof smoother.scrollTo === 'function') {
                try { smoother.scrollTo(preScrollY + offset, true); return; } catch {}
              }
              try {
                if (typeof window.scrollTo === 'function') {
                  window.scrollTo({ top: preScrollY + offset, left: 0, behavior: 'auto' });
                } else {
                  window.scrollTo(0, preScrollY + offset);
                }
              } catch {
                try { window.scrollTo(0, preScrollY + offset); } catch {}
              }
            });
          };

          // First correction
          correctTo(delta);

          // Also correct after any ScrollTrigger refresh cycle that may run
          try {
            const ST = (typeof window !== 'undefined' && window.ScrollTrigger) ? window.ScrollTrigger : null;
            if (ST && typeof ST.addEventListener === 'function') {
              let done = false;
              const onRef = () => {
                if (done) return;
                done = true;
                // slight defer to ensure transforms are applied
                requestAnimationFrame(() => correctTo(delta));
                try { ST.removeEventListener('refresh', onRef); } catch {}
                try { ST.removeEventListener('refreshInit', onRef); } catch {}
              };
              ST.addEventListener('refreshInit', onRef);
              ST.addEventListener('refresh', onRef);
              // safety timeout removal
              setTimeout(() => { try { ST.removeEventListener('refresh', onRef); ST.removeEventListener('refreshInit', onRef); } catch {} }, 500);
            }
          } catch {}

          // Second-pass correction next frame if any residual drift remains
          requestAnimationFrame(() => {
            const afterTop2 = itemEl.getBoundingClientRect().top;
            const delta2 = afterTop2 - beforeTop;
            if (Math.abs(delta2) > 1) {
              correctTo(delta + delta2);
            }
          });
          // safety: final correction after a small delay
          setTimeout(() => {
            const afterTop3 = itemEl.getBoundingClientRect().top;
            const delta3 = afterTop3 - beforeTop;
            if (Math.abs(delta3) > 1) correctTo(delta + delta3);
          }, 60);
        }
      });
    });
  }, [openIndex]);

  // Ensure refs array length matches
  useLayoutEffect(() => {
    itemRefs.current = itemRefs.current.slice(0, data.length);
    panelRefs.current = panelRefs.current.slice(0, data.length);
  }, [data.length]);

  // Keep only the active panel adjusted; avoid touching others on each toggle
  useLayoutEffect(() => {
    panelRefs.current.forEach((panel, i) => {
      if (!panel) return;
      if (openIndex === i) {
        panel.style.height = "auto";
        panel.style.overflow = "";
      } else {
        panel.style.height = "0px";
        panel.style.overflow = "hidden";
      }
    });
  }, [openIndex]);

  return (
    <section id="faq2" className="faq2-section">
      <div className="faq2-grid">
        <aside className="faq2-aside">
          <h2 className="faq2-title">{title}</h2>
          {subtitle && <p className="faq2-subtitle">{subtitle}</p>}
        </aside>

        <div className="faq2-list">
          {data.map(([q, a], idx) => {
            const isOpen = openIndex === idx;
            return (
              <div
                className={`faq2-item ${isOpen ? "is-open" : ""}`}
                key={idx}
                ref={(el) => (itemRefs.current[idx] = el)}
              >
                <button
                  id={`faq2-q-${idx}`}
                  className="faq2-question"
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(idx);
                  }}
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`faq2-panel-${idx}`}
                >
                  <span>{q}</span>
                  <span className="faq2-arrow">▼</span>
                </button>

                <div
                  className="faq2-collapse"
                  id={`faq2-panel-${idx}`}
                  ref={(el) => (panelRefs.current[idx] = el)}
                  role="region"
                  aria-labelledby={`faq2-q-${idx}`}
                >
                  <div className="faq2-content">
                    <p>{a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
  // Utility: run a function with root scroll-behavior forced to 'auto', restore next frame
  const withInstantScroll = (fn) => {
    try {
      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      try { fn && fn(); } finally {
        requestAnimationFrame(() => { try { root.style.scrollBehavior = prev; } catch {} });
      }
    } catch { fn && fn(); }
  };
