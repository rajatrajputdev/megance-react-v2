import { useState } from "react";
import "./faq2.css";

export default function FAQ2({ items, title = "FAQs", subtitle }) {
  const [openIndex, setOpenIndex] = useState(null);

  const data = items || [
    [
      "What size should I order?",
      "We recommend checking our size chart before ordering. If you're between sizes, go half a size up.",
    ],
    [
      "Are your sneakers suitable for running?",
      "Our casual sneakers are for everyday use. For performance, check our running shoes collection.",
    ],
    [
      "Do you offer wide-fit shoes?",
      "Yes, wide-fit options are available on select models. Look for the 'Wide Fit' tag.",
    ],
    [
      "How can I clean my sneakers?",
      "Use mild soap, a soft brush, and avoid harsh chemicals. Check care instructions for details.",
    ],
    [
      "Do your shoes come with a warranty?",
      "We offer a 6-month manufacturing warranty against defects on all our shoes.",
    ],
    [
      "Are your shoes vegan-friendly?",
      "Our vegan range is made without animal products. Check the 'Vegan' tag while browsing.",
    ],
    [
      "Can I return worn shoes?",
      "Shoes can be returned if unworn and in original packaging within 14 days of delivery.",
    ],
    [
      "Do you ship internationally?",
      "Yes, international shipping is available. Delivery times may vary based on destination.",
    ],
    [
      "Are your shoes true to size?",
      "Our shoes generally run true to size. Refer to product descriptions for model-specific guidance.",
    ],
  ];

  const toggle = (idx) => setOpenIndex((cur) => (cur === idx ? null : idx));

  return (
    <section className="faq2-section" aria-label="Frequently Asked Questions">
      <div className="faq2-grid">
        <aside className="faq2-aside">
          <h2 className="faq2-title">{title}</h2>
          {subtitle ? <p className="faq2-subtitle">{subtitle}</p> : null}
        </aside>
        <div className="faq2-list">
          {data.map(([q, a], idx) => {
            const isOpen = openIndex === idx;
            const qId = `faq2-q-${idx}`;
            const aId = `faq2-a-${idx}`;
            return (
              <div className={`faq2-item${isOpen ? " is-open" : ""}`} key={qId}>
                <button
                  id={qId}
                  className="faq2-question"
                  aria-expanded={isOpen}
                  aria-controls={aId}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(idx); }}
                  type="button"
                >
                  <span className="faq2-question-text">{q}</span>
                  <span className="faq2-arrow" aria-hidden>▼</span>
                </button>
                <div
                  id={aId}
                  className="faq2-collapse"
                  role="region"
                  aria-labelledby={qId}
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
