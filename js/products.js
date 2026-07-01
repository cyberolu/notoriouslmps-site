import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productGrid = document.getElementById("productGrid");

async function loadProducts() {
  if (!productGrid) return;

  productGrid.innerHTML = "<p>Loading products...</p>";

  try {
    const q = query(
      collection(db, "products"),
      orderBy("createdAt", "desc")
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      productGrid.innerHTML = "<p>No lamps are available at the moment.</p>";
      return;
    }

    productGrid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const product = docSnap.data();

      if (!product.images || product.images.length === 0) return;

      const card = document.createElement("a");
      card.className = "product-card";
      card.href = `/product/?id=${docSnap.id}`;

      card.innerHTML = `
        <img
          src="${product.images[0]}"
          alt="${product.title || "Handmade lamp"}"
          onerror="this.src='/assets/placeholder.jpg';"
        >

        <h3>${product.title || "Untitled Lamp"}</h3>

        <p class="price">
          £${Number(product.price || 0).toFixed(2)}
        </p>
      `;

      productGrid.appendChild(card);
    });
  } catch (err) {
    console.error("Products loading error:", err);

    productGrid.innerHTML = `
      <p>
        Sorry, we couldn't load the products.
        Please try again later.
      </p>
    `;
  }
}

loadProducts();