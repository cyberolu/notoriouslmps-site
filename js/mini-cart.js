const miniCartEl = document.getElementById("miniCart");
const miniCartItemsEl = document.getElementById("miniCartItems");

function getCart() {
  return JSON.parse(localStorage.getItem("cart")) || [];
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function renderMiniCart() {
  if (!miniCartItemsEl) return;

  const cart = getCart();
  miniCartItemsEl.innerHTML = "";

  if (cart.length === 0) {
    miniCartItemsEl.innerHTML = "<p>Your cart is empty.</p>";
    return;
  }

  cart.forEach((item, index) => {
    const div = document.createElement("div");
    div.className = "mini-cart-item";

    const stockInfo =
      item.stock !== undefined
        ? `<small>Stock: ${item.stock}</small>`
        : "";

    div.innerHTML = `
      <img src="${item.image}" alt="">
      <div class="mini-cart-item-info">
        <strong>${item.title}</strong><br>
        £${item.price.toFixed(2)}<br>
        ${stockInfo}
      </div>
      <div class="mini-cart-item-actions">
        <button data-minus>-</button>
        <span>${item.qty}</span>
        <button data-plus>+</button>
        <button data-remove>✕</button>
      </div>
    `;

    // Decrease quantity
    div.querySelector("[data-minus]").addEventListener("click", () => {
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        cart.splice(index, 1);
      }
      saveCart(cart);
      updateAll();
    });

    // Increase quantity (respect stock)
    div.querySelector("[data-plus]").addEventListener("click", () => {
      if (item.stock !== undefined && item.qty >= item.stock) {
        alert("No more stock available for this item.");
        return;
      }
      item.qty += 1;
      saveCart(cart);
      updateAll();
    });

    // Remove item
    div.querySelector("[data-remove]").addEventListener("click", () => {
      cart.splice(index, 1);
      saveCart(cart);
      updateAll();
    });

    miniCartItemsEl.appendChild(div);
  });
}

function updateAll() {
  renderMiniCart();

  if (window.updateCartCount) {
    window.updateCartCount();
  }

  // Update main cart page if present
  if (typeof renderCart === "function") {
    renderCart();
  }
}

// Initial render
renderMiniCart();

// Keep in sync across tabs
window.addEventListener("storage", renderMiniCart);

// Expose for other scripts
window.renderMiniCart = renderMiniCart;
