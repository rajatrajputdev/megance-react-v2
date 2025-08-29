
$(function () {

    "use strict";

    var testim = new Swiper(".testim-sm .testim-swiper", {
        slidesPerView: 3,
        spaceBetween: 30,
        centeredSlides: true,
        loop: true,
        speed: 1500,
        autoplay: {
            delay: 5000,
        },
        loop: true,
        pagination: {
            el: ".testim-sm .swiper-pagination",
            clickable: true,
        },
        breakpoints: {
            0: {
                slidesPerView: 1,
            },
            640: {
                slidesPerView: 1,
            },
            768: {
                slidesPerView: 2,
            },
            1024: {
                slidesPerView: 3,
            },
        }
    });

});


// $(function () {
//     var width = $(window).width();
//     if (width > 300) {

//         "use strict";

//         $(function () {
//             let cards = gsap.utils.toArray(".work-card-ms .cards .card-item");
    
//             let stickDistance = 0;
    
//             let firstCardST = ScrollTrigger.create({
//                 trigger: cards[0],
//                 start: "center center"
//             });
    
//             let lastCardST = ScrollTrigger.create({
//                 trigger: cards[cards.length - 1],
//                 start: "bottom bottom"
//             });
    
//             cards.forEach((card, index) => {
//                 var scale = 1 - (cards.length - index) * 0;
//                 let scaleDown = gsap.to(card, { scale: scale, 'transform-origin': '"50% ' + (lastCardST.start + stickDistance) + '"' });
    
//                 ScrollTrigger.create({
//                     trigger: card,
//                     start: "center center",
//                     end: () => lastCardST.start + stickDistance,
//                     pin: true,
//                     pinSpacing: false,
//                     ease: "none",
//                     animation: scaleDown,
//                     toggleActions: "restart none none reverse"
//                 });
//             });
//         });

//     }
// });
// $(function () {
//     const width = $(window).width();

//     if (width >= 0) { // Only apply on tablets & desktops
//         "use strict";
//         gsap.registerPlugin(ScrollTrigger);

//         const cards = gsap.utils.toArray(".work-card-ms .cards .card-item");

//         cards.forEach((card, index) => {
//             gsap.to(card, {
//                 y: -100,
//                 scale: 0.95,                // subtle zoom-out
//                 rotationX: 5,               // 3D tilt effect
//                 ease: "none",
//                 scrollTrigger: {
//                     trigger: card,
//                     start: "center center",
//                     end: "bottom center",
//                     pin: true,
//                     scrub: true,
//                     pinSpacing: true,
//                     markers: false
//                 }
//             });
//         });

//         // Refresh ScrollTrigger after everything is loaded
//         window.addEventListener("load", () => {
//             ScrollTrigger.refresh();
//         });
//     }
// });

// This code is commented out as it was not functioning correctly.
// It was intended to create a pinning effect for each card in the work section.
// Uncomment and modify as needed for your specific use case.
// $(function () {
//     const width = $(window).width();

//     if (width > 300) {

//         "use strict";
//         gsap.registerPlugin(ScrollTrigger);

//         const cards = gsap.utils.toArray(".work-card-ms .cards .card-item");

//         cards.forEach((card, index) => {

//             gsap.to(card, {
//                 y: -100, // Move upward by 100px
//                 ease: "none",
//                 scrollTrigger: {
//                     trigger: card,
//                     start: "center center",
//                     end: "bottom center",
//                     pin: true,
//                     scrub: true,   // Smooth animation synced with scroll
//                     pinSpacing: false, // Prevent layout collapsing
//                     markers: false  // Set to true for debugging
//                 }
//             });
//         });
//     }
// });
// $(function () {
//     $(".faq-question").on("click", function () {
//         const answer = $(this).next(".faq-answer");
//         const arrow = $(this).find(".arrow");

//         // Close other answers
//         $(".faq-answer").not(answer).each(function () {
//             gsap.to(this, { height: 0, opacity: 0, duration: 0.3 });
//         });
//         $(".arrow").not(arrow).each(function () {
//             gsap.to(this, { rotation: 0, duration: 0.3 });
//         });

//         if (answer.height() > 0) {
//             // Collapse current
//             gsap.to(answer, { height: 0, opacity: 0, duration: 0.3 });
//             gsap.to(arrow, { rotation: 0, duration: 0.3 });
//         } else {
//             // Expand current
//             const contentHeight = answer.children("p").outerHeight(true) + 20;
//             gsap.to(answer, { height: contentHeight, opacity: 1, duration: 0.3 });
//             gsap.to(arrow, { rotation: 180, duration: 0.3 });
//         }
//     });
// });
$(function () {
    $(".faq-question").on("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        const answer = $(this).next(".faq-answer");
        const arrow = $(this).find(".arrow");

        // Collapse other answers
        $(".faq-answer").not(answer).each(function () {
            gsap.to(this, { maxHeight: 0, opacity: 0, duration: 0.3 });
        });
        $(".arrow").not(arrow).each(function () {
            gsap.to(this, { rotation: 0, duration: 0.3 });
        });

        if (answer.css("max-height") !== "0px") {
            // Collapse current
            gsap.to(answer[0], { maxHeight: 0, opacity: 0, duration: 0.3 });
            gsap.to(arrow[0], { rotation: 0, duration: 0.3 });
        } else {
            // Expand current
            const scrollHeight = answer[0].scrollHeight + "px";
            gsap.to(answer[0], {
                maxHeight: scrollHeight,
                opacity: 1,
                duration: 0.3,
                onUpdate: ScrollTrigger.refresh // ✅ Tell GSAP scroll has changed
            });
            gsap.to(arrow[0], { rotation: 180, duration: 0.3 });
        }
    });
});

  $(function () {
    const logo = document.querySelector(".logo");

    // Set initial state
    gsap.set(logo, { opacity: 0, scale: 0.95 });

    // Wait for logo image to load
    if (logo.complete) {
      animateLogo();
    } else {
      logo.addEventListener("load", animateLogo);
    }

    function animateLogo() {
      // Fade and scale the logo in
      gsap.to(logo, {
        opacity: 1,
        scale: 1,
        duration: 0.5,
        ease: "power2.out",
        onComplete: startLoaderAnimation,
      });
    }

    function startLoaderAnimation() {
      const svg = document.getElementById("svg");
      const tl = gsap.timeline();
      const curve = "M0 502S175 272 500 272s500 230 500 230V0H0Z";
      const flat = "M0 2S175 1 500 1s500 1 500 1V0H0Z";

      // Fade out the logo + content
      tl.to(".loader-wrap-heading .load-text , .loader-wrap-heading .cont", {
        delay: 1.2,
        y: -100,
        opacity: 0,
        ease: "power2.inOut"
      });

      // Animate the SVG curve
      tl.to(svg, {
        duration: 0.5,
        attr: { d: curve },
        ease: "power2.easeIn",
      }).to(svg, {
        duration: 0.5,
        attr: { d: flat },
        ease: "power2.easeOut",
      });

      // Slide the whole preloader up
      tl.to(".loader-wrap", {
        y: -1500,
        duration: 1,
        ease: "power2.in"
      });

      // Remove it from the flow
      tl.set(".loader-wrap", {
        zIndex: -1,
        display: "none",
      });

      // Bring in the page content (header)
      tl.from("header .container", {
        y: 100,
        opacity: 0,
        delay: 0.3,
      }, "-=1.5");
    }
  });
