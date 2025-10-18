export default function USP() {
  const items = [
    { img: "/assets/imgs/usp/left.webp", text: "Premium Craftsmanship" },
    { img: "/assets/imgs/usp/middle.webp", text: "Engineered Comfort" },
    { img: "/assets/imgs/usp/right.webp", text: "Luxury Sneaker Aesthetics" },
  ];

  return (
    <>
      <section className="serv-ms bg-img" data-overlay-dark="4">
        <div className="container">
          <div className="row">
            {items.map((item, idx) => (
              <div className="col-lg-4" key={idx}>
                <div className="usp-item">
                  <img src={item.img} alt="" className="usp-img" />
                  <div className="usp-hover-text">
                    <span>{item.text}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        .usp-item {
          position: relative;
          overflow: hidden;
          border-radius: 12px;
          height: 100%; /* Ensures uniform tile size */
          cursor: pointer;
        }

        .usp-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
          transition: transform 0.4s ease;
        }

        .usp-item:hover .usp-img {
          transform: scale(1.05);
        }

        .usp-hover-text {
          position: absolute;
          left: 0;
          bottom: 0;
          width: 100%;
          padding: 14px 18px;
          text-align: center;
          background: rgba(0, 0, 0, 0.65);
          color: #fff;
          font-size: 14px;
          font-weight: 500;
          opacity: 0;
          transform: translateY(100%);
          transition: all 0.35s ease;
          letter-spacing: 0.5px;
          backdrop-filter: blur(4px);
        }

        .usp-item:hover .usp-hover-text {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>
    </>
  );
}
