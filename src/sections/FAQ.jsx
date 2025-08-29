import { useEffect } from "react";

export default function FAQ() {
  useEffect(() => {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    if (gsap && ScrollTrigger) {
      gsap.registerPlugin(ScrollTrigger);
    }

    const onClick = (e) => {
      e.preventDefault();
      e.stopPropagation();

      const question = e.currentTarget;
      const answer = question.nextElementSibling;
      const arrow = question.querySelector('.arrow');
      if (!answer || !gsap) return;

      // Collapse others
      document.querySelectorAll('.faq-answer').forEach((node) => {
        if (node !== answer) {
          gsap.to(node, { maxHeight: 0, opacity: 0, duration: 0.3 });
        }
      });
      document.querySelectorAll('.faq-question .arrow').forEach((node) => {
        if (node !== arrow) gsap.to(node, { rotation: 0, duration: 0.3 });
      });

      const isOpen = getComputedStyle(answer).maxHeight !== '0px';
      if (isOpen) {
        gsap.to(answer, { maxHeight: 0, opacity: 0, duration: 0.3 });
        if (arrow) gsap.to(arrow, { rotation: 0, duration: 0.3 });
      } else {
        const contentHeight = answer.scrollHeight + 'px';
        gsap.to(answer, {
          maxHeight: contentHeight,
          opacity: 1,
          duration: 0.3,
          onUpdate: () => { if (ScrollTrigger && ScrollTrigger.refresh) ScrollTrigger.refresh(); },
        });
        if (arrow) gsap.to(arrow, { rotation: 180, duration: 0.3 });
      }
    };

    const questions = Array.from(document.querySelectorAll('.faq-question'));
    questions.forEach((q) => q.addEventListener('click', onClick));
    return () => questions.forEach((q) => q.removeEventListener('click', onClick));
  }, []);

  return (
    <section>
      <section className="faq-section">
        <h2>FAQs</h2>
        <div className="faq-container">
          {[
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
          ].map(([q, a]) => (
            <div className="faq-item" key={q}>
              <div className="faq-question">
                <span>{q}</span>
                <span className="arrow">▼</span>
              </div>
              <div className="faq-answer">
                <p>{a}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
