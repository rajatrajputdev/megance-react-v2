export function loadRazorpay(src = "https://checkout.razorpay.com/v1/checkout.js") {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve(true);
    s.onerror = () => reject(new Error("Failed to load Razorpay"));
    document.body.appendChild(s);
  });
}

export async function openRazorpayCheckout({ amount, currency = "INR", name, description, prefill, notes, onSuccess, onDismiss }) {
  await loadRazorpay();
  // Hardcoded for now as requested (do not use secret on frontend)
  const key = "rzp_test_RCPn3qRC9s7g22";
  const options = {
    key,
    amount: Math.round(amount * 100),
    currency,
    name: name || "Megance",
    description: description || "Order Payment",
    prefill: prefill || {},
    notes: notes || {},
    handler: function (response) {
      if (onSuccess) onSuccess(response);
    },
    modal: {
      ondismiss: function () {
        if (onDismiss) onDismiss();
      },
    },
    theme: { color: "#000000" },
  };
  const rzp = new window.Razorpay(options);
  rzp.open();
}
