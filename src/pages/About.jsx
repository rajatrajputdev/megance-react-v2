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
          <img
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
<br/><br/>
We believe footwear should feel like an extension of identity and movement, not just a seasonal trend.
<br/><br/>
Every release from Megance is created in controlled volumes using premium suede and a design language focused on minimal styling and long-term wear. Instead of following hype-driven sneaker cycles, we release in structured drops that build a story over time.
<br/><br/>
The Infinity Collection marks our first chapter. Each sneaker in this drop is influenced by the mood of a different city - not through direct prints or graphics, but through tone, finish, and movement. The intention is simple: to create sneakers that carry atmosphere.
<br/><br/>
Megance stands for:
<strong>
<ul style={{listStyleType:"disc"}}>
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

<br/><br/>
Welcome inside.
                </p>
                {/* Add more lorem ipsum paragraphs here */}
              </div>
            </div>
          </div>
        </section>

        {/* Services Section */}
        {/* <section className="services-section py-5 bg-light">
          <div className="container">
            <h2 className="text-center mb-5">Our Services</h2>
            <div className="row">
              <div className="col-md-4 mb-4">
                <div className="service-card text-center">
                  <img src="https://picsum.photos/400/300?random=1" alt="Service 1" className="img-fluid mb-3" />
                  <h3>Custom Design</h3>
                  <p>Create unique and personalized designs tailored to your needs.</p>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="service-card text-center">
                  <img src="https://picsum.photos/400/300?random=2" alt="Service 2" className="img-fluid mb-3" />
                  <h3>Digital Solutions</h3>
                  <p>Comprehensive digital solutions for modern businesses.</p>
                </div>
              </div>
              <div className="col-md-4 mb-4">
                <div className="service-card text-center">
                  <img src="https://picsum.photos/400/300?random=3" alt="Service 3" className="img-fluid mb-3" />
                  <h3>Creative Innovation</h3>
                  <p>Innovative approaches to solve complex challenges.</p>
                </div>
              </div>
            </div>
          </div>
        </section> */}

        {/* Our Work Section */}
        {/* <section className="work-section py-5">
          <div className="container">
            <h2 className="text-center mb-5">Our Work</h2>
            <div className="row">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <div key={index} className="col-md-4 mb-4">
                  <div className="work-item">
                    <img
                      src={`https://picsum.photos/600/400?random=${index + 10}`}
                      alt={`Work ${index}`}
                      className="img-fluid"
                      style={{ width: '100%', height: '300px', objectFit: 'cover' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section> */}

        <Footer />
      </div>
    </>
  );
};

export default About;
