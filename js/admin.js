import { auth, db } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById("productForm");
const productList = document.getElementById("productList");
const logoutBtn = document.getElementById("logoutBtn");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

let editingProductId = null;

/* =====================
   Auth Guard
===================== */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  document.body.style.display = "block";
  loadProducts();
});

/* =====================
   Add / Update Product
===================== */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = form.title.value.trim();
  const price = Number(form.price.value);
  const stock = Number(form.stock.value);
  const description = form.description.value.trim();
  const featured = form.featured.checked;

  const images = form.images.value
    .split(",")
    .map(url => url.trim())
    .filter(Boolean);

  if (images.length === 0) {
    alert("At least one image is required");
    return;
  }

  if (stock < 0) {
    alert("Stock cannot be negative");
    return;
  }

  const productData = {
    title,
    price,
    stock,
    description,
    images,
    featured
  };

  if (editingProductId) {
    await updateDoc(doc(db, "products", editingProductId), productData);
  } else {
    await addDoc(collection(db, "products"), {
      ...productData,
      createdAt: serverTimestamp()
    });
  }

  resetForm();
  loadProducts();
});

/* =====================
   Load Products
===================== */

async function loadProducts() {
  productList.innerHTML = "";

  const snapshot = await getDocs(collection(db, "products"));

  snapshot.forEach((docSnap) => {
    const product = docSnap.data();
    const thumbUrl = product.images?.[0] || "";

    const div = document.createElement("div");
    div.className = "product-item";

    div.innerHTML = `
      <div class="product-thumb">
        ${thumbUrl ? `<img src="${thumbUrl}" alt="">` : ""}
      </div>

      <div class="product-info">
        <strong>${product.title}</strong><br>
        £${product.price}<br>
        Stock: ${product.stock}<br>
        ${product.featured ? "⭐ Featured" : ""}
      </div>

      <div class="product-actions">
        <button data-edit>Edit</button>
        <button data-delete>Delete</button>
      </div>
    `;

    div.querySelector("[data-edit]").addEventListener("click", () => {
      startEdit(docSnap.id, product);
    });

    div.querySelector("[data-delete]").addEventListener("click", async () => {
      if (confirm("Delete this product?")) {
        await deleteDoc(doc(db, "products", docSnap.id));
        loadProducts();
      }
    });

    productList.appendChild(div);
  });
}

/* =====================
   Edit Helpers
===================== */

function startEdit(id, product) {
  editingProductId = id;

  form.title.value = product.title;
  form.price.value = product.price;
  form.stock.value = product.stock;
  form.description.value = product.description;
  form.images.value = product.images.join(", ");
  form.featured.checked = !!product.featured;

  formTitle.textContent = "Edit Product";
  submitBtn.textContent = "Update product";
  cancelEditBtn.style.display = "inline-block";
}

cancelEditBtn.addEventListener("click", resetForm);

function resetForm() {
  editingProductId = null;
  form.reset();

  formTitle.textContent = "Add Product";
  submitBtn.textContent = "Add product";
  cancelEditBtn.style.display = "none";
}

/* =====================
   Logout
===================== */

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  window.location.href = "/";
});
