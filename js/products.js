import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const productGrid = document.querySelector(".product-grid");

async function loadProducts() {
  const q = query(
    collection(db, "products"),
    orderBy("createdAt", "desc")
  );

  const snapshot = await getDocs(q);
  productGrid.innerHTML = "";

  snapshot.forEach((docSnap) => {
    const product = docSnap.data();

    if (!product.images || product.images.length === 0) return;

    const card = document.createElement("a");
    card.className = "product-card";
    card.href = `/product/index.html?id=${docSnap.id}`;

    card.innerHTML = `
      <img src="${product.images[0]}" alt="${product.title}">
      <h3>${product.title}</h3>
      <p class="price">£${product.price}</p>
    `;

    productGrid.appendChild(card);
  });
}

loadProducts();
