import { auth, db } from "./firebase.js";
import { isAdmin } from "./auth.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ordersList = document.getElementById("ordersList");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login/";
    return;
  }

  if (!(await isAdmin(user.uid))) {
    await signOut(auth);
    window.location.href = "/";
    return;
  }

  document.body.style.display = "block";
  loadOrders();
});

async function loadOrders() {
  const snapshot = await getDocs(collection(db, "orders"));

  if (snapshot.empty) {
    ordersList.innerHTML = "<p>No orders yet.</p>";
    return;
  }

  ordersList.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const order = docSnap.data();

    const div = document.createElement("div");
    div.className = "product-item";

    div.innerHTML = `
      <div class="product-info">
        <strong>Order: ${docSnap.id}</strong><br>
        Customer: ${order.customerName || "Unknown"}<br>
        Email: ${order.customerEmail || "N/A"}<br>
        Total: £${Number(order.total || 0).toFixed(2)}<br>
        Status: ${order.status || "processing"}
      </div>
    `;

    ordersList.appendChild(div);
  });
}