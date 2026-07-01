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

const customersList = document.getElementById("customersList");

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
  loadCustomers();
});

async function loadCustomers() {
  try {
    const snapshot = await getDocs(collection(db, "users"));

    if (snapshot.empty) {
      customersList.innerHTML = "<p>No customers yet.</p>";
      return;
    }

    let rows = "";

    snapshot.forEach((docSnap) => {
      const customer = docSnap.data();

      const joined = customer.createdAt?.toDate
        ? customer.createdAt.toDate().toLocaleDateString("en-GB")
        : "N/A";

      rows += `
        <tr>
          <td>${customer.name || "Customer"}</td>
          <td>${customer.email || "N/A"}</td>
          <td>${customer.provider || "N/A"}</td>
          <td>${customer.role || "customer"}</td>
          <td>0</td>
          <td>£0.00</td>
          <td>${joined}</td>
        </tr>
      `;
    });

    customersList.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Provider</th>
              <th>Role</th>
              <th>Orders</th>
              <th>Total Spent</th>
              <th>Joined</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </div>
    `;
  } catch (error) {
    console.error("Customer load error:", error);
    customersList.innerHTML = "<p>Customers could not be loaded.</p>";
  }
}