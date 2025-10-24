import React from 'react';
import Footer from '../components/homepage_components/Footer';
import SEO from '../components/general_components/SEO';
import '../styles/about.css';

const About = () => {
  return (
    <>
      <SEO title="About Us - Megance" />
      <div className="white-navbar-page">
        {/* Hero Image Section */}
        <div className="about-hero-image">
          <img loading="lazy"
            src="/assets/imgs/works/aboutusbanner.webp"
            alt="About Us Hero"

          />
        </div>

        {/* About Us Content */}
        <section className="about-content py-5">
          <div className="container">
            <h1 className="mb-5">About Megance</h1>
            <div className="row">
              <div className="col-12">
                <p>
                  Megance is a premium sneaker label from India built around the idea of calm streetwear design.
                  <br /><br />
                  We believe footwear should feel like an extension of identity and movement, not just a seasonal trend.
                  <br /><br />
                  Every release from Megance is created in controlled volumes using premium suede and a design language focused on minimal styling and long-term wear. Instead of following hype-driven sneaker cycles, we release in structured drops that build a story over time.
                  <br /><br />
                  The Infinity Collection marks our first chapter. Each sneaker in this drop is influenced by the mood of a different city - not through direct prints or graphics, but through tone, finish, and movement. The intention is simple: to create sneakers that carry atmosphere.
                  <br /><br />
                  Megance stands for:
                  <strong>
                    <ul style={{ listStyleType: "disc" }}>
                      <li>
                        Premium suede craftsmanship with controlled production</li>
                      <li>
                        Minimal streetwear styling designed to age well</li>
                      <li>City-inspired creative direction to give each drop purpose
                      </li>
                      <li>
                        A calm approach to sneaker culture focused on presence instead of noise</li>
                    </ul>
                  </strong>


                  This is not mass manufacturing.
                  This is Drop 01 of a new sneaker story from India.

                  <br /><br />
                  Welcome inside.
                </p>
              </div>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    </>
  );
};

export default About;
