export default function ZellerSection() {
  return (
    <div className="zeller_section">
      <div className="zeller_bg" id="zellerBg"></div>
      <div className="zeller_overlay" id="zellerOverlay"></div>

      <div className="zeller_content">
        <h1 className="fade-up">The Future of Footwear</h1>
        <p className="fade-up">
          Step into innovation. Designed for comfort, performance, and individuality.
        </p>

        <div className="zeller_cards">
          <div className="zeller_card fade-up">
            <img src="/assets/imgs/shoes/s1.png" alt="Card 1" />
            <h3>Design X</h3>
            <p>Bold and functional</p>
          </div>
          <div className="zeller_card fade-up">
            <img src="/assets/imgs/shoes/s1.png" alt="Card 2" />
            <h3>Runner</h3>
            <p>Speed meets comfort</p>
          </div>
          <div className="zeller_card fade-up">
            <img src="/assets/imgs/shoes/s1.png" alt="Card 3" />
            <h3>Urban Grid</h3>
            <p>Built for city steps</p>
          </div>
        </div>
      </div>
    </div>
  );
}
