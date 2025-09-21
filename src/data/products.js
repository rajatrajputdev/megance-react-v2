export const products = [
  {
    id: "aeon-eclipse",
    name: "Aeon v2 ECLIPSE",
    price: 4499,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Bold performance runner engineered for daily miles.",
    genders: ["men", "women"],
    sizes: {
      men: ["6", "7", "8", "9", "10", "11"],
      women: ["4", "5", "6", "7", "8", "9"],
    },
  },
  {
    id: "volt-boost-max",
    name: "Volt Boost Max",
    price: 3899,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Responsive cushioning and all-day comfort.",
    genders: ["men", "women"],
    sizes: {
      men: ["6", "7", "8", "9", "10"],
      women: ["4", "5", "6", "7", "8"],
    },
  },
  {
    id: "stride-runner-pro",
    name: "Stride Runner Pro",
    price: 3299,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Lightweight classic with modern grip.",
    genders: ["men", "women"],
    sizes: {
      men: ["6", "7", "8", "9", "10", "11"],
      women: ["4", "5", "6", "7", "8"],
    },
  },
  {
    id: "echo-flex-zoom",
    name: "Echo Flex Zoom",
    price: 4799,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Flexible knit upper with locked-in fit.",
    genders: ["men", "women"],
    sizes: {
      men: ["6", "7", "8", "9", "10"],
      women: ["4", "5", "6", "7", "8", "9"],
    },
  },
];

export function getProductById(id) {
  return products.find((p) => p.id === id);
}
