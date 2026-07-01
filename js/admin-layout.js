import { auth } from "./firebase.js";

import {
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const adminHeader = document.getElementById("adminHeader");

if (adminHeader) {
  adminHeader.innerHTML = `
    <header class="admin-header">
      <div>
        <h1>Notorious Lamps Admin</h1>
        <p>Manage products, orders, customers and settings.</p>
      </div>

      <nav class="admin-nav">
        <a href="/admin/">Dashboard</a>
        <a href="/admin/products/">Products</a>
        <a href="/admin/orders/">Orders</a>
        <a href="/admin/customers/">Customers</a>
        <a href="/admin/settings/">Settings</a>
        <a href="/" target="_blank">🏪 View Store</a>
        <button type="button" id="adminLogoutBtn" class="nav-button">Logout</button>
      </nav>
    </header>
  `;

  const logoutBtn = document.getElementById("adminLogoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await signOut(auth);
      window.location.href = "/";
    });
  }
}