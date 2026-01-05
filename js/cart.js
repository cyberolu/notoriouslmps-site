const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const emptyNotice = document.getElementById("emptyNotice");

let cart = JSON.parse(localStorage.getItem("cart")) || [];

function renderCart() {
  cartItemsEl.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<p>Your cart is empty.</p>";
    cartTotalEl.textContent = "0.00";

    checkoutBtn.disabled = true;
    emptyNotice.style.display = "block";

    if (window.updateCartCount) {
      window.updateCartCount();
    }
    return;
  }

  checkoutBtn.disabled = false;
  emptyNotice.style.display = "none";

  cart.forEach((item, index) => {
    total += item.price * item.qty;

    const div = document.createElement("div");
    div.className = "cart-item";

    const stockText = item.stock !== undefined
      ? `<small>Stock available: ${item.stock}</small>`
      : "";

    div.innerHTML = `
      <img src="${item.image}" alt="">
      <div class="cart-item-info">
        <strong>${item.title}</strong><br>
        £${item.price.toFixed(2)}<br>
        ${stockText}
      </div>

      <div class="cart-item-actions">
        <button data-minus>-</button>
        <span>${item.qty}</span>
        <button data-plus>+</button>
        <button data-remove>Remove</button>
      </div>
    `;

    // Decrease quantity
    div.querySelector("[data-minus]").addEventListener("click", () => {
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        cart.splice(index, 1);
      }
      saveAndRender();
    });

    // Increase quantity (respect stock)
    div.querySelector("[data-plus]").addEventListener("click", () => {
      if (item.stock !== undefined && item.qty >= item.stock) {
        alert("You have reached the maximum available stock for this item.");
        return;
      }
      item.qty += 1;
      saveAndRender();
    });

    // Remove item
    div.querySelector("[data-remove]").addEventListener("click", () => {
      cart.splice(index, 1);
      saveAndRender();
    });

    cartItemsEl.appendChild(div);
  });

  cartTotalEl.textContent = total.toFixed(2);

  if (window.updateCartCount) {
    window.updateCartCount();
  }
}

function saveAndRender() {
  localStorage.setItem("cart", JSON.stringify(cart));
  renderCart();
}

renderCart();
