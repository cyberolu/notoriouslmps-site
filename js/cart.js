import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const cartItemsEl = document.getElementById("cartItems");
const cartTotalEl = document.getElementById("cartTotal");
const checkoutBtn = document.getElementById("checkoutBtn");
const emptyNotice = document.getElementById("emptyNotice");

const cartHeading = document.getElementById("cartHeading");

onAuthStateChanged(auth, async (user) => {
  if (!cartHeading) return;

  if (!user) {
    cartHeading.textContent = "Your Cart";
    return;
  }

  const userSnap = await getDoc(doc(db, "users", user.uid));

  const name =
    userSnap.exists() && userSnap.data().name
      ? userSnap.data().name
      : user.displayName || "Customer";

  cartHeading.textContent = `${name}'s Cart`;
});

let cart = getCart();

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch (error) {
    console.error("Invalid cart data:", error);
    localStorage.removeItem("cart");
    return [];
  }
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function renderCart() {
  if (!cartItemsEl || !cartTotalEl || !checkoutBtn) return;

  cartItemsEl.innerHTML = "";
  let total = 0;

  if (cart.length === 0) {
    cartItemsEl.innerHTML = "<p>Your cart is empty.</p>";
    cartTotalEl.textContent = "0.00";
    checkoutBtn.disabled = true;

    if (emptyNotice) {
      emptyNotice.style.display = "block";
    }

    updateCartHelpers();
    return;
  }

  checkoutBtn.disabled = false;

  if (emptyNotice) {
    emptyNotice.style.display = "none";
  }

  cart.forEach((item, index) => {
    const price = Number(item.price || 0);
    const qty = Number(item.qty || 1);

    total += price * qty;

    const div = document.createElement("div");
    div.className = "cart-item";

    div.innerHTML = `
      <img
        src="${item.image || "/assets/placeholder.jpg"}"
        alt="${item.title || "Lamp"}"
        onerror="this.src='/assets/placeholder.jpg';"
      >

      <div class="cart-item-info">
        <strong>${item.title || "Untitled Lamp"}</strong><br>
        £${price.toFixed(2)}
      </div>

      <div class="cart-item-actions">
        <button type="button" data-minus>-</button>
        <span>${qty}</span>
        <button type="button" data-plus>+</button>
        <button type="button" data-remove>Remove</button>
      </div>
    `;

    div.querySelector("[data-minus]").addEventListener("click", () => {
      if (item.qty > 1) {
        item.qty -= 1;
      } else {
        cart.splice(index, 1);
      }

      saveAndRender();
    });

    div.querySelector("[data-plus]").addEventListener("click", () => {
      if (item.stock !== undefined && item.qty >= item.stock) {
        alert("No more stock available for this item.");
        return;
      }

      item.qty += 1;
      saveAndRender();
    });

    div.querySelector("[data-remove]").addEventListener("click", () => {
      cart.splice(index, 1);
      saveAndRender();
    });

    cartItemsEl.appendChild(div);
  });

  cartTotalEl.textContent = total.toFixed(2);
  updateCartHelpers();
}

function saveAndRender() {
  saveCart();
  renderCart();
}

function updateCartHelpers() {
  if (window.updateCartCount) {
    window.updateCartCount();
  }

  if (window.renderMiniCart) {
    window.renderMiniCart();
  }
}

checkoutBtn.addEventListener("click", async () => {
  if (!cart.length) return;

  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Redirecting...";

  try {
    const res = await fetch("/.netlify/functions/create-checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        items: cart
      })
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || "Checkout request failed");
    }

    if (!data.url) {
      throw new Error("No checkout URL returned");
    }

    window.location.href = data.url;
  } catch (err) {
    console.error("Checkout error:", err);

    alert("Checkout failed. Please try again.");

    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Proceed to Secure Checkout";
  }
});

window.renderCart = renderCart;

renderCart();