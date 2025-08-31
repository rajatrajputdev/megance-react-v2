export const products = [
  {
    id: "aeon-eclipse",
    name: "Aeon v2 ECLIPSE",
    price: 4499,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Bold performance runner engineered for daily miles.",
  },
  {
    id: "volt-boost-max",
    name: "Volt Boost Max",
    price: 3899,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Responsive cushioning and all-day comfort.",
  },
  {
    id: "stride-runner-pro",
    name: "Stride Runner Pro",
    price: 3299,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Lightweight classic with modern grip.",
  },
  {
    id: "echo-flex-zoom",
    name: "Echo Flex Zoom",
    price: 4799,
    image: "/assets/imgs/shoes/s1.png",
    hover: "/assets/imgs/shoes/s2.jpg",
    description: "Flexible knit upper with locked-in fit.",
  },
];

export function getProductById(id) {
  return products.find((p) => p.id === id);
}

