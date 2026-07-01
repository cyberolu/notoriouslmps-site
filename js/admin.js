import { auth, db, storage } from "./firebase.js";
import { isAdmin } from "./auth.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const form = document.getElementById("productForm");
const productList = document.getElementById("productList");
const formTitle = document.getElementById("formTitle");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const addShadeBtn = document.getElementById("addShadeBtn");
const shadeOptionsList = document.getElementById("shadeOptionsList");

let editingProductId = null;

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login/";
    return;
  }

  if (!(await isAdmin(user.uid))) {
    window.location.href = "/";
    return;
  }

  document.body.style.display = "block";
  loadProducts();
});

addShadeBtn.addEventListener("click", () => {
  addShadeRow();
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const title = form.title.value.trim();
  const price = Number(form.price.value);
  const stock = Number(form.stock.value);
  const description = form.description.value.trim();
  const featured = form.featured.checked;
  const allowNoShade = form.allowNoShade.checked;

  const imageFiles = Array.from(form.imageFiles.files || []);
  const existingImages = form.existingImages.value
    ? JSON.parse(form.existingImages.value)
    : [];

  if (!title || !description) {
    alert("Please complete all required fields.");
    return;
  }

  if (price < 0 || stock < 0) {
    alert("Price and stock cannot be negative.");
    return;
  }

  if (!editingProductId && imageFiles.length === 0) {
    alert("Please upload at least one main product image.");
    return;
  }

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = "Saving...";

    const uploadedImages = await uploadProductImages(imageFiles, "products");
    const images = [...existingImages, ...uploadedImages];

    const shadeOptions = await collectShadeOptions();

    const productData = {
      title,
      price,
      stock,
      description,
      images,
      featured,
      allowNoShade,
      shadeOptions
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
    await loadProducts();
  } catch (error) {
    console.error("Product save error:", error);
    alert("Product could not be saved.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingProductId ? "Update lamp" : "Add lamp";
  }
});

function addShadeRow(option = {}) {
  const row = document.createElement("div");
  row.className = "shade-option-row";

  row.innerHTML = `
    <label>
      Shade name
      <input type="text" class="shade-name" value="${option.name || ""}" placeholder="Cream linen">
    </label>

    <label>
      Extra price (£)
      <input type="number" class="shade-price" step="0.01" min="0" value="${option.extraPrice || 0}">
    </label>

    <label>
      Shade image
      <input type="file" class="shade-image-file" accept="image/*">
    </label>

    <input type="hidden" class="shade-existing-image" value="${option.imageUrl || ""}">

    ${
      option.imageUrl
        ? `<img src="${option.imageUrl}" alt="${option.name || "Shade"}" class="shade-preview">`
        : ""
    }

    <button type="button" class="remove-shade-btn">Remove Shade</button>
  `;

  row.querySelector(".remove-shade-btn").addEventListener("click", () => {
    row.remove();
  });

  shadeOptionsList.appendChild(row);
}

async function collectShadeOptions() {
  const rows = document.querySelectorAll(".shade-option-row");
  const options = [];

  for (const row of rows) {
    const name = row.querySelector(".shade-name").value.trim();
    const extraPrice = Number(row.querySelector(".shade-price").value || 0);
    const fileInput = row.querySelector(".shade-image-file");
    const existingImage = row.querySelector(".shade-existing-image").value;

    if (!name) continue;

    let imageUrl = existingImage || "";

    if (fileInput.files && fileInput.files[0]) {
      const uploaded = await uploadProductImages(
        [fileInput.files[0]],
        "shade-options"
      );

      imageUrl = uploaded[0];
    }

    options.push({
      name,
      extraPrice,
      imageUrl
    });
  }

  return options;
}

async function uploadProductImages(files, folder = "products") {
  const urls = [];

  for (const file of files) {
    const cleanName = file.name.replace(/\s+/g, "-").toLowerCase();
    const filePath = `${folder}/${Date.now()}-${cleanName}`;
    const fileRef = ref(storage, filePath);

    await uploadBytes(fileRef, file);

    const url = await getDownloadURL(fileRef);
    urls.push(url);
  }

  return urls;
}

async function loadProducts() {
  productList.innerHTML = "<p>Loading lamps...</p>";

  try {
    const snapshot = await getDocs(collection(db, "products"));

    if (snapshot.empty) {
      productList.innerHTML = "<p>No lamps added yet.</p>";
      return;
    }

    productList.innerHTML = "";

    snapshot.forEach((docSnap) => {
      const product = docSnap.data();
      const thumbUrl = product.images?.[0] || "/assets/placeholder.jpg";

      const div = document.createElement("div");
      div.className = "product-item";

      div.innerHTML = `
        <div class="product-thumb">
          <img
            src="${thumbUrl}"
            alt="${product.title || "Lamp"}"
            onerror="this.src='/assets/placeholder.jpg';"
          >
        </div>

        <div class="product-info">
          <strong>${product.title || "Untitled Lamp"}</strong><br>
          Base price: £${Number(product.price || 0).toFixed(2)}<br>
          Stock: ${Number(product.stock || 0)}<br>
          Main images: ${product.images?.length || 0}<br>
          Shade options: ${product.shadeOptions?.length || 0}<br>
          ${product.allowNoShade ? "Can buy without shade<br>" : ""}
          ${product.featured ? "⭐ Featured" : ""}
        </div>

        <div class="product-actions">
          <button type="button" data-edit>Edit</button>
          <button type="button" data-delete>Delete</button>
        </div>
      `;

      div.querySelector("[data-edit]").addEventListener("click", () => {
        startEdit(docSnap.id, product);
      });

      div.querySelector("[data-delete]").addEventListener("click", async () => {
        if (!confirm("Delete this lamp?")) return;

        await deleteDoc(doc(db, "products", docSnap.id));
        await loadProducts();
      });

      productList.appendChild(div);
    });
  } catch (error) {
    console.error("Product load error:", error);
    productList.innerHTML = "<p>Lamps could not be loaded.</p>";
  }
}

function startEdit(id, product) {
  editingProductId = id;

  form.title.value = product.title || "";
  form.allowNoShade.checked = product.allowNoShade !== false;
  form.price.value = product.price || 0;
  form.stock.value = product.stock || 0;
  form.description.value = product.description || "";
  form.existingImages.value = JSON.stringify(product.images || []);
  form.existingShadeOptions.value = JSON.stringify(product.shadeOptions || []);
  form.featured.checked = !!product.featured;

  shadeOptionsList.innerHTML = "";

  (product.shadeOptions || []).forEach((option) => {
    addShadeRow(option);
  });

  formTitle.textContent = "Edit Lamp";
  submitBtn.textContent = "Update lamp";
  cancelEditBtn.style.display = "inline-block";

  window.scrollTo({ top: 0, behavior: "smooth" });
}

cancelEditBtn.addEventListener("click", resetForm);

function resetForm() {
  editingProductId = null;
  form.reset();
  form.existingImages.value = "";
  form.existingShadeOptions.value = "";
  shadeOptionsList.innerHTML = "";

  formTitle.textContent = "Add Lamp";
  submitBtn.textContent = "Add lamp";
  cancelEditBtn.style.display = "none";
}