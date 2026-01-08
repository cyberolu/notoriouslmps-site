import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const grid = document.getElementById("featuredGrid");

if (grid) {
  loadFeatured();
}

async function loadFeatured() {
  grid.innerHTML = "";

  const q = query(
    collection(db, "products"),
    where("featured", "==", true),
    limit(3) // match your original 3 featured pieces
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    grid.innerHTML = "<p>No featured pieces available.</p>";
    return;
  }

  snapshot.forEach((docSnap) => {
    const product = docSnap.data();

    const card = document.createElement("a");
    card.href = `/product/?id=${docSnap.id}`;
    card.className = "product-card";

    card.innerHTML = `
      <img src="${product.images[0]}" alt="">
      <h3>${product.title}</h3>
      <p>£${product.price}</p>
    `;

    grid.appendChild(card);
  });
}
