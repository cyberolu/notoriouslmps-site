import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const grid = document.getElementById("featuredGrid");

if (grid) {
  loadFeatured();
}

async function loadFeatured() {
  grid.innerHTML = "<p>Loading featured lamps...</p>";

  try {
    const q = query(
      collection(db, "products"),
      where("featured", "==", true),
      limit(3)
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      grid.innerHTML = "<p>No featured lamps available yet.</p>";
      return;
    }

    grid.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const product = docSnap.data();

      if (!product.images || product.images.length === 0) return;

      const card = document.createElement("a");
      card.href = `/product/?id=${docSnap.id}`;
      card.className = "product-card";

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

      grid.appendChild(card);
    });
  } catch (error) {
    console.error("Featured products error:", error);
    grid.innerHTML = "<p>Sorry, featured lamps could not be loaded.</p>";
  }
}