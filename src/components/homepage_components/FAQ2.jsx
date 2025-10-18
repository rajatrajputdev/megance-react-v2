import { useState, useCallback } from "react";
import "./faq2.css";

export default function FAQ2({ items, title = "FAQs", subtitle }) {
  const [openIndex, setOpenIndex] = useState(null);

  const data = items || [
    ["What makes Megance suede sneakers different from regular sneakers?", "Megance uses premium suede material, stitched and finished for a luxury look, unlike mass-market sneakers. Each pair goes through detailed quality checks and is crafted in India, with a focus on comfort, design aesthetics, and long-term durability."],
    ["How much do Megance suede sneakers cost, including delivery and taxes?", "All Megance infinity collection sneakers are priced at ₹5,450, inclusive of GST, delivery, and handling charges. There are no hidden fees or extra shipping costs at checkout"],
    ["Do you offer Cash on Delivery (COD) for sneakers in India?", "Yes, Megance offers COD across most Indian pin codes. However, customers with repeated COD refusals may be shifted to prepaid-only eligibility to reduce RTO and logistics waste."],
    ["How long does delivery take for Megance sneakers?", "Once shipped, delivery for Megance sneakers typically takes 3–7 working days, depending on your location."],
    ["How do I know my sneaker size before ordering?", "We provide a detailed sneaker size chart for India on our website to help you select your perfect fit. Megance sneakers follow true-to-size measurements similar to Nike, Puma, and Adidas Originals sneaker sizing."],
    ["How do I care for my suede sneakers to keep them looking new?", "To maintain your premium suede sneakers, avoid harsh cleaning chemicals and use a soft suede brush or suede cleaning spray. Keep them away from moisture to preserve the texture and rich suede finish."],
    ["Are Megance sneakers unisex?", "Yes, Megance suede sneakers are designed to be gender-neutral. Both male and female sneaker enthusiasts can style the Infinity Collection colorways effortlessly."],
    ["What is the best way to style Megance suede sneakers?", "Megance sneakers are crafted for minimal streetwear styling. Pair them with neutral fits, oversized tees, monotone sets, or layered winter outfits for a clean luxury aesthetic."],
  ];

  const toggle = useCallback((index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  }, []);

  return (
    <section className="faq2-section">
      <div className="faq2-grid">
        <aside className="faq2-aside">
          <h2 className="faq2-title">{title}</h2>
          {subtitle && <p className="faq2-subtitle">{subtitle}</p>}
        </aside>

        <div className="faq2-list">
          {data.map(([q, a], idx) => {
            const isOpen = openIndex === idx;
            return (
              <div className={`faq2-item ${isOpen ? "is-open" : ""}`} key={idx}>
                <button className="faq2-question" onClick={() => toggle(idx)}>
                  <span>{q}</span>
                  <span className="faq2-arrow">▼</span>
                </button>

                <div className="faq2-collapse">
                  <p>{a}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
