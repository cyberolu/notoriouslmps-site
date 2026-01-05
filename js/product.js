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

async function loadProduct() {
  const snap = await getDoc(doc(db, "products", productId));
  currentProduct = snap.data();

  titleEl.textContent = currentProduct.title;
  priceEl.textContent = `£${currentProduct.price}`;
  descriptionEl.textContent = currentProduct.description;

  setMainImage(currentProduct.images[0]);

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
   Cart Logic
===================== */

addToCartBtn.addEventListener("click", () => {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  const existing = cart.find(item => item.id === productId);

  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: productId,
      title: currentProduct.title,
      price: currentProduct.price,
      image: currentProduct.images[0],
      qty: 1
    });
  }

  localStorage.setItem("cart", JSON.stringify(cart));
  alert("Added to cart");
});

loadProduct();
