import { db } from "./firebase.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const titleEl = document.getElementById("productTitle");
const priceEl = document.getElementById("productPrice");
const descriptionEl = document.getElementById("productDescription");
const mainImage = document.getElementById("mainImage");
const thumbnails = document.getElementById("thumbnails");
const addToCartBtn = document.getElementById("addToCartBtn");

let currentProduct = null;

/* =====================
   Load Product
===================== */

async function loadProduct() {
  if (!productId) {
    alert("Product not found");
    return;
  }

  const snap = await getDoc(doc(db, "products", productId));

  if (!snap.exists()) {
    alert("Product not found");
    return;
  }

  currentProduct = snap.data();

  titleEl.textContent = currentProduct.title;
  priceEl.textContent = `£${currentProduct.price}`;
  descriptionEl.textContent = currentProduct.description;

  // Handle stock
  if (currentProduct.stock <= 0) {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = "Sold out";
  }

  setMainImage(currentProduct.images[0]);

  thumbnails.innerHTML = "";

  currentProduct.images.forEach((url) => {
    const thumb = document.createElement("div");
    thumb.className = "thumb";
    thumb.innerHTML = `<img src="${url}" alt="">`;

    thumb.addEventListener("click", () => {
      setMainImage(url);
    });

    thumbnails.appendChild(thumb);
  });
}

function setMainImage(url) {
  mainImage.innerHTML = `<img src="${url}" alt="">`;
}

/* =====================
   Cart Logic (Stock Safe)
===================== */

addToCartBtn.addEventListener("click", () => {
  if (!currentProduct || currentProduct.stock <= 0) {
    return;
  }

  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    if (existing.qty >= currentProduct.stock) {
      alert("No more stock available for this item.");
      return;
    }
    existing.qty += 1;
  } else {
    cart.push({
      id: productId,
      title: currentProduct.title,
      price: currentProduct.price,
      image: currentProduct.images[0],
      qty: 1,
      stock: currentProduct.stock
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));

  if (window.updateCartCount) {
    window.updateCartCount();
  }

  alert("Added to cart");
});

loadProduct();
