import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const accountCartItems = document.getElementById("accountCartItems");

onAuthStateChanged(auth, async (user) => {

  if (!user) {
    window.location.href = "/login/";
    return;
  }

  document.body.style.display = "block";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {

    const data = userSnap.data();

    userName.textContent = data.name || "Customer";
    userEmail.textContent = data.email;

  } else {

    userName.textContent = user.displayName || "Customer";
    userEmail.textContent = user.email;

  }

  renderMiniAccountCart();

});

logoutBtn.addEventListener("click", async () => {

  await signOut(auth);

  window.location.href = "/";

});

function renderMiniAccountCart() {

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (!cart.length) {

    accountCartItems.innerHTML = `
      <p>Your basket is empty.</p>
    `;

    return;
  }

  accountCartItems.innerHTML = "";

  cart.forEach(item => {

    const div = document.createElement("div");

    div.className = "account-cart-item";

    div.innerHTML = `
      <strong>${item.title}</strong><br>
      Qty: ${item.qty}<br>
      £${(item.price * item.qty).toFixed(2)}
      <hr>
    `;

    accountCartItems.appendChild(div);

  });

}