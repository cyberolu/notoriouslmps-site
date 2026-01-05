function updateCartCount() {
    const countEl = document.getElementById("cartCount");
    if (!countEl) return;
  
    const cart = JSON.parse(localStorage.getItem("cart")) || [];
  
    const totalQty = cart.reduce((sum, item) => {
      return sum + (Number(item.qty) || 0);
    }, 0);
  
    countEl.textContent = totalQty;
  }
  
  // Run on page load
  updateCartCount();
  
  // Update if cart changes in another tab
  window.addEventListener("storage", updateCartCount);
  
  // Expose globally so other scripts can trigger updates
  window.updateCartCount = updateCartCount;
  