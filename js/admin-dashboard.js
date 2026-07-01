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

const logoutBtn = document.getElementById("logoutBtn");
const productCount = document.getElementById("productCount");
const orderCount = document.getElementById("orderCount");
const customerCount = document.getElementById("customerCount");
const revenueTotal = document.getElementById("revenueTotal");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login/";
    return;
  }

  const admin = await isAdmin(user.uid);

  if (!admin) {
    alert("You are not authorised to access the admin area.");
    await signOut(auth);
    window.location.href = "/";
    return;
  }

  document.body.style.display = "block";
  loadDashboardStats();
});

async function loadDashboardStats() {
  const productsSnap = await getDocs(collection(db, "products"));
  const usersSnap = await getDocs(collection(db, "users"));

  productCount.textContent = productsSnap.size;
  customerCount.textContent = usersSnap.size;

  try {
    const ordersSnap = await getDocs(collection(db, "orders"));

    let revenue = 0;

    ordersSnap.forEach((docSnap) => {
      const order = docSnap.data();
      revenue += Number(order.total || 0);
    });

    orderCount.textContent = ordersSnap.size;
    revenueTotal.textContent = `£${revenue.toFixed(2)}`;
  } catch {
    orderCount.textContent = "0";
    revenueTotal.textContent = "£0.00";
  }
}

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/";
});