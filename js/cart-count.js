function updateCartCount() {
  const countEl = document.getElementById("cartCount");

  if (!countEl) return;

  let cart = [];

  try {
    cart = JSON.parse(localStorage.getItem("cart")) || [];
  } catch (error) {
    console.error("Invalid cart data:", error);
    localStorage.removeItem("cart");
  }

  const totalQty = cart.reduce((total, item) => {
    return total + (Number(item.qty) || 0);
  }, 0);

  countEl.textContent = totalQty;
}

// Initial load
document.addEventListener("DOMContentLoaded", updateCartCount);

// Sync between browser tabs
window.addEventListener("storage", updateCartCount);

// Allow other scripts to refresh the counter
window.updateCartCount = updateCartCount;