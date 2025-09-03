export default function Newsletter() {
  return (
    <section className="newsletter-section">
      <div className="newsletter-container">
        <div className="newsletter-left"></div>
        <div className="newsletter-right">
          <h2>Subscribe for exclusive products, new arrivals and to be first on limited Drops</h2>
          <form className="newsletter-form">
            <input type="email" placeholder="Enter your email" required />
            <button type="submit">Subscribe</button>
          </form>
          <p>Get the latest updates and exclusive offers.</p>
        </div>
      </div>
    </section>
  );
}

