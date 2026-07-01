import { db } from "./firebase.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const titleEl = document.getElementById("productTitle");
const priceEl = document.getElementById("productPrice");
const descriptionEl = document.getElementById("productDescription");
const stockStatusEl = document.getElementById("stockStatus");
const mainImage = document.getElementById("mainImage");
const thumbnails = document.getElementById("thumbnails");
const addToCartBtn = document.getElementById("addToCartBtn");
const shadeSelector = document.getElementById("shadeSelector");
const shadeOptionsEl = document.getElementById("shadeOptions");
const shadePrev = document.getElementById("shadePrev");
const shadeNext = document.getElementById("shadeNext");

let currentProduct = null;
let selectedShade = null;

if (shadePrev && shadeNext && shadeOptionsEl) {
  shadePrev.addEventListener("click", () => {
    shadeOptionsEl.scrollBy({
      left: -180,
      behavior: "smooth"
    });
  });

  shadeNext.addEventListener("click", () => {
    shadeOptionsEl.scrollBy({
      left: 180,
      behavior: "smooth"
    });
  });
}

async function loadProduct() {
  if (!productId) {
    showMissingProduct();
    return;
  }

  try {
    const snap = await getDoc(doc(db, "products", productId));

    if (!snap.exists()) {
      showMissingProduct();
      return;
    }

    currentProduct = snap.data();

    const images = currentProduct.images || [];
    const firstImage = images[0] || "/assets/placeholder.jpg";

    titleEl.textContent = currentProduct.title || "Untitled Lamp";
    descriptionEl.textContent = currentProduct.description || "No description available.";

    setStockStatus(currentProduct.stock);
    setMainImage(firstImage, currentProduct.title);
    const galleryImages = [
      ...images,
      ...(currentProduct.shadeOptions || [])
        .map((shade) => shade.imageUrl)
        .filter(Boolean)
    ];

renderThumbnails(galleryImages);
    renderShadeOptions();
    updateDisplayedPrice();

  } catch (error) {
    console.error("Product loading error:", error);
    showMissingProduct();
  }
}

function renderThumbnails(images) {
  thumbnails.innerHTML = "";

  images.forEach((url, index) => {
    const thumb = document.createElement("button");
    thumb.type = "button";
    thumb.className = index === 0 ? "thumb active" : "thumb";

    thumb.innerHTML = `
      <img
        src="${url}"
        alt="${currentProduct.title || "Lamp thumbnail"}"
        onerror="this.src='/assets/placeholder.jpg';"
      >
    `;

    thumb.addEventListener("click", () => {
      clearActiveThumbs();
      thumb.classList.add("active");
      setMainImage(url, currentProduct.title);
    });

    thumbnails.appendChild(thumb);
  });
}

function renderShadeOptions() {
  const shadeOptions = currentProduct.shadeOptions || [];

  shadeOptionsEl.innerHTML = "";

  if (!shadeOptions.length && !currentProduct.allowNoShade) {
    shadeSelector.style.display = "none";
    selectedShade = null;
    return;
  }

  shadeSelector.style.display = "block";

  if (currentProduct.allowNoShade) {
    const noShade = {
      name: "No Shade",
      extraPrice: 0,
      imageUrl: currentProduct.images?.[0] || "/assets/placeholder.jpg"
    };

    addShadeButton(noShade, true);
    selectedShade = noShade;
  }

  shadeOptions.forEach((shade) => {
    addShadeButton(shade, false);
  });
}

function addShadeButton(shade, isActive) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = isActive ? "shade-option active" : "shade-option";

  button.innerHTML = `
    ${
      shade.imageUrl
        ? `<img src="${shade.imageUrl}" alt="${shade.name}" onerror="this.src='/assets/placeholder.jpg';">`
        : ""
    }
    <span>${shade.name}</span>
    <small>${Number(shade.extraPrice || 0) > 0 ? `+£${Number(shade.extraPrice).toFixed(2)}` : "Included"}</small>
  `;

  button.addEventListener("click", () => {
    document
      .querySelectorAll(".shade-option")
      .forEach((el) => el.classList.remove("active"));

    button.classList.add("active");
    selectedShade = shade;

    if (shade.imageUrl) {
      setMainImage(shade.imageUrl, `${currentProduct.title} - ${shade.name}`);
    }

    updateDisplayedPrice();
  });

  shadeOptionsEl.appendChild(button);
}

function updateDisplayedPrice() {
  const basePrice = Number(currentProduct.price || 0);
  const shadePrice = Number(selectedShade?.extraPrice || 0);
  priceEl.textContent = `£${(basePrice + shadePrice).toFixed(2)}`;
}

function clearActiveThumbs() {
  document
    .querySelectorAll(".thumb")
    .forEach((el) => el.classList.remove("active"));
}

function setMainImage(url, title = "Product image") {
  mainImage.src = url || "/assets/placeholder.jpg";
  mainImage.alt = title;
  mainImage.onerror = () => {
    mainImage.src = "/assets/placeholder.jpg";
  };
}

function setStockStatus(stock) {
  const stockNumber = Number(stock || 0);

  if (stockNumber <= 0) {
    stockStatusEl.textContent = "Sold out";
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = "Sold out";
    return;
  }

  stockStatusEl.textContent =
    stockNumber <= 2 ? `Low stock: ${stockNumber} left` : "In stock";

  addToCartBtn.disabled = false;
  addToCartBtn.textContent = "Add to Cart";
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    localStorage.removeItem("cart");
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

addToCartBtn.addEventListener("click", () => {
  if (!currentProduct) return;

  const stock = Number(currentProduct.stock || 0);
  if (stock <= 0) return;

  const finalPrice =
    Number(currentProduct.price || 0) + Number(selectedShade?.extraPrice || 0);

  const shadeName = selectedShade?.name || "No Shade";
  const cartId = `${productId}_${shadeName.replace(/\s+/g, "-").toLowerCase()}`;

  const cart = getCart();
  const existing = cart.find((item) => item.cartId === cartId);

  if (existing) {
    if (existing.qty >= stock) {
      alert("No more stock available for this item.");
      return;
    }

    existing.qty += 1;
  } else {
    cart.push({
      cartId,
      id: productId,
      title: currentProduct.title || "Untitled Lamp",
      shadeName,
      price: finalPrice,
      image: selectedShade?.imageUrl || currentProduct.images?.[0] || "/assets/placeholder.jpg",
      qty: 1,
      stock
    });
  }

  saveCart(cart);

  if (window.updateCartCount) window.updateCartCount();
  if (window.renderMiniCart) window.renderMiniCart();

  alert("Added to cart");
});

function showMissingProduct() {
  titleEl.textContent = "Product not found";
  priceEl.textContent = "";
  descriptionEl.textContent = "This lamp may have been removed or sold.";
  stockStatusEl.textContent = "";
  addToCartBtn.disabled = true;
  addToCartBtn.textContent = "Unavailable";
  setMainImage("/assets/placeholder.jpg", "Product not found");
}

loadProduct();