// Simple coupon dataset for demo use on frontend
// Do not implement real validation on the client in production.
export const coupons = [
  {
    code: "WELCOME10",
    type: "percent", // percent or flat
    value: 10, // 10% off
    minAmount: 1000,
    label: "10% off (min ₹1000)",
  },
  {
    code: "MEGANCE100",
    type: "flat", // flat ₹100 off
    value: 100,
    minAmount: 799,
    label: "₹100 off (min ₹799)",
  },
  {
    code: "FESTIVE15",
    type: "percent",
    value: 15,
    minAmount: 2500,
    label: "15% off (min ₹2500)",
  },
];

export function findCoupon(input) {
  if (!input) return null;
  const code = String(input).trim().toUpperCase();
  return coupons.find((c) => c.code === code) || null;
}

export function computeDiscount({ amount, coupon }) {
  if (!coupon || !amount || amount <= 0) return 0;
  if (coupon.minAmount && amount < coupon.minAmount) return 0;
  if (coupon.type === "flat") return Math.min(amount, coupon.value);
  if (coupon.type === "percent") return Math.floor((amount * coupon.value) / 100);
  return 0;
}

