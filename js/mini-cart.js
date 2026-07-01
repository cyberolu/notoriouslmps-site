const miniCartItemsEl = document.getElementById("miniCartItems");

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch (error) {
    console.error("Invalid cart data:", error);
    localStorage.removeItem("cart");
    return [];
  }
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

    div.innerHTML = `
      <img
        src="${item.image || "/assets/placeholder.jpg"}"
        alt="${item.title || "Lamp"}"
        onerror="this.src='/assets/placeholder.jpg';"
      >

      <div class="mini-cart-item-info">
        <strong>${item.title || "Untitled lamp"}</strong><br>
        £${Number(item.price || 0).toFixed(2)}<br>
        <small>Qty: ${Number(item.qty) || 1}</small>
      </div>

      <div class="mini-cart-item-actions">
        <button type="button" data-minus>-</button>
        <button type="button" data-plus>+</button>
        <button type="button" data-remove>✕</button>
      </div>
    `;

    div.querySelector("[data-minus]").addEventListener("click", () => {
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        cart.splice(index, 1);
      }

      saveCart(cart);
      updateAll();
    });

    div.querySelector("[data-plus]").addEventListener("click", () => {
      if (item.stock !== undefined && item.qty >= item.stock) {
        alert("No more stock available for this item.");
        return;
      }

      item.qty += 1;
      saveCart(cart);
      updateAll();
    });

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

  if (typeof window.renderCart === "function") {
    window.renderCart();
  }
}

document.addEventListener("DOMContentLoaded", renderMiniCart);
window.addEventListener("storage", renderMiniCart);
window.renderMiniCart = renderMiniCart;