import { db } from "./firebase.js";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const params = new URLSearchParams(window.location.search);
const productId = params.get("id");

const titleEl = document.getElementById("productTitle");
const breadcrumbTitle = document.getElementById("breadcrumbTitle");
const priceEl = document.getElementById("productPrice");
const descriptionEl = document.getElementById("productDescription");
const stockStatusEl = document.getElementById("stockStatus");

const mainImage = document.getElementById("mainImage");
const thumbnails = document.getElementById("thumbnails");
const imageCounter = document.getElementById("imageCounter");

const galleryPrev = document.getElementById("galleryPrev");
const galleryNext = document.getElementById("galleryNext");

const addToCartBtn = document.getElementById("addToCartBtn");
const buyNowBtn = document.getElementById("buyNowBtn");

const shadeSelector = document.getElementById("shadeSelector");
const shadeOptionsEl = document.getElementById("shadeOptions");
const shadePrev = document.getElementById("shadePrev");
const shadeNext = document.getElementById("shadeNext");

const noShadeOption = document.getElementById("noShadeOption");
const selectedShadeName = document.getElementById("selectedShadeName");

const lightViewSelector = document.getElementById(
  "lightViewSelector"
);

const lightsOffBtn = document.getElementById("lightsOffBtn");
const lightsOnBtn = document.getElementById("lightsOnBtn");

const lampPriceSummary = document.getElementById(
  "lampPriceSummary"
);

const shadePriceRow = document.getElementById("shadePriceRow");
const shadePriceLabel = document.getElementById(
  "shadePriceLabel"
);

const shadePriceSummary = document.getElementById(
  "shadePriceSummary"
);

const productTotal = document.getElementById("productTotal");

let currentProduct = null;
let linkedShadeOptions = [];
let selectedOption = null;
let selectedLightView = "off";

let galleryEntries = [];
let currentGalleryIndex = 0;

/* =========================================
   Shade carousel
========================================= */

shadePrev?.addEventListener("click", () => {
  shadeOptionsEl?.scrollBy({
    left: -220,
    behavior: "smooth"
  });
});

shadeNext?.addEventListener("click", () => {
  shadeOptionsEl?.scrollBy({
    left: 220,
    behavior: "smooth"
  });
});

/* =========================================
   Main gallery controls
========================================= */

galleryPrev?.addEventListener("click", () => {
  if (galleryEntries.length === 0) return;

  currentGalleryIndex =
    currentGalleryIndex === 0
      ? galleryEntries.length - 1
      : currentGalleryIndex - 1;

  activateGalleryEntry(currentGalleryIndex);
});

galleryNext?.addEventListener("click", () => {
  if (galleryEntries.length === 0) return;

  currentGalleryIndex =
    currentGalleryIndex === galleryEntries.length - 1
      ? 0
      : currentGalleryIndex + 1;

  activateGalleryEntry(currentGalleryIndex);
});

/* =========================================
   Light controls
========================================= */

lightsOffBtn?.addEventListener("click", () => {
  if (!selectedOption || selectedOption.type !== "shade") {
    return;
  }

  selectedLightView = "off";
  updateLightButtons();
  showSelectedShadeImage();
});

lightsOnBtn?.addEventListener("click", () => {
  if (!selectedOption || selectedOption.type !== "shade") {
    return;
  }

  selectedLightView = "on";
  updateLightButtons();
  showSelectedShadeImage();
});

function updateLightButtons() {
  lightsOffBtn?.classList.toggle(
    "active",
    selectedLightView === "off"
  );

  lightsOnBtn?.classList.toggle(
    "active",
    selectedLightView === "on"
  );
}

function showSelectedShadeImage() {
  if (!selectedOption || selectedOption.type !== "shade") {
    return;
  }

  const matchingIndex = galleryEntries.findIndex(
    (entry) =>
      entry.shadeId === selectedOption.shadeId &&
      entry.lightView === selectedLightView
  );

  if (matchingIndex >= 0) {
    activateGalleryEntry(matchingIndex);
    return;
  }

  const imageUrl =
    selectedLightView === "on"
      ? selectedOption.lightsOnImage
      : selectedOption.lightsOffImage;

  setMainImage(
    imageUrl,
    `${currentProduct.title} with ${selectedOption.title}, lights ${selectedLightView}`
  );
}

/* =========================================
   Load product
========================================= */

async function loadProduct() {
  if (!productId) {
    showMissingProduct();
    return;
  }

  try {
    const productSnapshot = await getDoc(
      doc(db, "products", productId)
    );

    if (!productSnapshot.exists()) {
      showMissingProduct();
      return;
    }

    currentProduct = {
      id: productSnapshot.id,
      ...productSnapshot.data()
    };

    currentProduct.productType =
      currentProduct.productType || "lamp";

    if (titleEl) {
      titleEl.textContent =
        currentProduct.title || "Untitled Product";
    }

    if (breadcrumbTitle) {
      breadcrumbTitle.textContent =
        currentProduct.title || "Product";
    }

    if (descriptionEl) {
      descriptionEl.textContent =
        currentProduct.description ||
        "No description available.";
    }

    setStockStatus(currentProduct.stock);

    if (currentProduct.productType === "shade") {
      renderStandaloneShade();
    } else {
      await renderLamp();
    }
  } catch (error) {
    console.error("Product loading error:", error);
    showMissingProduct();
  }
}

/* =========================================
   Standalone shade
========================================= */

function renderStandaloneShade() {
  const images = currentProduct.images || [];

  const firstImage =
    images[0] || "/assets/placeholder.jpg";

  selectedOption = {
    type: "standalone-shade",
    shadeId: currentProduct.id,
    title: currentProduct.title || "Shade",
    price: Number(currentProduct.price || 0),
    stock: Number(currentProduct.stock || 0),
    image: firstImage
  };

  if (shadeSelector) {
    shadeSelector.style.display = "none";
  }

  if (lightViewSelector) {
    lightViewSelector.hidden = true;
  }

  galleryEntries = images.map((imageUrl) => ({
    url: imageUrl,
    alt: currentProduct.title || "Shade"
  }));

  if (galleryEntries.length === 0) {
    galleryEntries = [
      {
        url: "/assets/placeholder.jpg",
        alt: currentProduct.title || "Shade"
      }
    ];
  }

  renderGalleryThumbnails();
  activateGalleryEntry(0);
  updateDisplayedPrice();
}

/* =========================================
   Lamp product
========================================= */

async function renderLamp() {
  linkedShadeOptions =
    await loadLampShadePairings(
      currentProduct.id
    );

  buildLampGallery();
  renderGalleryThumbnails();
  renderShadeChoices();

  const firstAvailableShade =
    linkedShadeOptions[0];

  if (firstAvailableShade) {
    selectShade(firstAvailableShade);
    return;
  }

  if (currentProduct.allowNoShade === true) {
    selectNoShade();
    return;
  }

  selectedOption = null;

  setMainImage(
    "/assets/placeholder.jpg",
    currentProduct.title || "Lamp"
  );

  updateDisplayedPrice();
  updateAddToCartAvailability();
}

/* =========================================
   Load linked shades
========================================= */

async function loadLampShadePairings(lampId) {
  try {
    const pairingsQuery = query(
      collection(db, "lampShadePairings"),
      where("lampId", "==", lampId)
    );

    const pairingsSnapshot =
      await getDocs(pairingsQuery);


    const options = await Promise.all(
      pairingsSnapshot.docs.map(
        async (pairingSnapshot) => {
          const pairing = {
            id: pairingSnapshot.id,
            ...pairingSnapshot.data()
          };

          if (!pairing.shadeId) {
            return null;
          }

          try {
            const shadeSnapshot = await getDoc(
              doc(
                db,
                "products",
                pairing.shadeId
              )
            );

            if (!shadeSnapshot.exists()) {
              console.warn(
                `Shade ${pairing.shadeId} does not exist.`
              );

              return null;
            }

            const shade = shadeSnapshot.data();

            const stock = Number(
              shade.stock || 0
            );

            const available =
              shade.available !== false;

            if (!available || stock <= 0) {
              return null;
            }

            const shadeImage =
              shade.images?.[0] ||
              "/assets/placeholder.jpg";

            return {
              type: "shade",

              pairingId: pairingSnapshot.id,

              shadeId: shadeSnapshot.id,

              title:
                shade.title ||
                pairing.shadeTitle ||
                "Shade",

              price: Number(
                shade.lampExtraPrice ??
                shade.price ??
                0
              ),

              standalonePrice: Number(
                shade.price || 0
              ),

              stock,

              standaloneImage: shadeImage,

              lightsOffImage:
                pairing.lightsOffImage ||
                shadeImage,

              lightsOnImage:
                pairing.lightsOnImage ||
                pairing.lightsOffImage ||
                shadeImage
            };
          } catch (error) {
            console.error(
              `Could not load shade ${pairing.shadeId}:`,
              error
            );

            return null;
          }
        }
      )
    );

    return options.filter(Boolean);
  } catch (error) {
    console.error(
      `Could not load pairings for lamp ${lampId}:`,
      error
    );

    return [];
  }
}
/* =========================================
   Build gallery
========================================= */

function buildLampGallery() {
  galleryEntries = [];

  linkedShadeOptions.forEach((option) => {
    galleryEntries.push({
      url: option.lightsOffImage,
      alt:
        `${currentProduct.title} with ${option.title}, lights off`,
      shadeId: option.shadeId,
      option,
      lightView: "off"
    });

    galleryEntries.push({
      url: option.lightsOnImage,
      alt:
        `${currentProduct.title} with ${option.title}, lights on`,
      shadeId: option.shadeId,
      option,
      lightView: "on"
    });
  });

  if (currentProduct.allowNoShade === true) {
    const lampImages = currentProduct.images || [];

    lampImages.forEach((imageUrl) => {
      galleryEntries.push({
        url: imageUrl,
        alt: `${currentProduct.title} without a shade`,
        option: {
          type: "no-shade",
          shadeId: null,
          title: "No Shade",
          price: 0,
          stock: Number(currentProduct.stock || 0),
          image: imageUrl
        },
        lightView: null
      });
    });
  }

  galleryEntries = removeDuplicateGalleryEntries(
    galleryEntries
  );

  if (galleryEntries.length === 0) {
    galleryEntries = [
      {
        url: "/assets/placeholder.jpg",
        alt: currentProduct.title || "Lamp"
      }
    ];
  }
}

/* =========================================
   Gallery thumbnails
========================================= */

function renderGalleryThumbnails() {
  if (!thumbnails) return;

  thumbnails.innerHTML = "";

  galleryEntries.forEach((entry, index) => {
    const thumbnail = document.createElement("button");

    thumbnail.type = "button";
    thumbnail.className =
      index === 0 ? "thumb active" : "thumb";

    if (entry.option?.type === "no-shade") {
      thumbnail.classList.add("lamp-only-thumbnail");
      thumbnail.title = "Lamp without shade";
    }

    thumbnail.innerHTML = `
      <img
        src="${entry.url}"
        alt="${escapeHtml(entry.alt || "Product thumbnail")}"
        onerror="this.src='/assets/placeholder.jpg';"
      >
    `;

    thumbnail.addEventListener("click", () => {
      activateGalleryEntry(index);
    });

    thumbnails.appendChild(thumbnail);
  });
}

function activateGalleryEntry(index) {
  const entry = galleryEntries[index];

  if (!entry) return;

  currentGalleryIndex = index;

  setMainImage(entry.url, entry.alt);

  document
    .querySelectorAll(".thumb")
    .forEach((thumbnail, thumbnailIndex) => {
      thumbnail.classList.toggle(
        "active",
        thumbnailIndex === index
      );
    });

  if (imageCounter) {
    imageCounter.textContent =
      `${index + 1} / ${galleryEntries.length}`;
  }

  if (entry.option?.type === "shade") {
    selectedOption = entry.option;
    selectedLightView = entry.lightView || "off";

    updateLightButtons();
    updateSelectedShadeButton(entry.option.shadeId);

    if (lightViewSelector) {
      lightViewSelector.hidden = false;
    }

    if (selectedShadeName) {
      selectedShadeName.textContent =
        entry.option.title;
    }
  }

  if (entry.option?.type === "no-shade") {
    selectedOption = entry.option;
    selectedLightView = "off";

    if (lightViewSelector) {
      lightViewSelector.hidden = true;
    }

    if (selectedShadeName) {
      selectedShadeName.textContent = "No Shade";
    }

    updateSelectedShadeButton(null);
  }

  updateDisplayedPrice();
  updateAddToCartAvailability();
}

function setMainImage(url, altText = "Product image") {
  if (!mainImage) return;

  mainImage.src = url || "/assets/placeholder.jpg";
  mainImage.alt = altText;

  mainImage.onerror = () => {
    mainImage.src = "/assets/placeholder.jpg";
  };
}

/* =========================================
   Shade choices
========================================= */

function renderShadeChoices() {
  if (!shadeOptionsEl || !shadeSelector) return;

  shadeOptionsEl.innerHTML = "";

  if (
    linkedShadeOptions.length === 0 &&
    currentProduct.allowNoShade !== true
  ) {
    shadeSelector.style.display = "none";

    if (lightViewSelector) {
      lightViewSelector.hidden = true;
    }

    if (noShadeOption) {
      noShadeOption.hidden = true;
    }

    return;
  }

  shadeSelector.style.display = "block";

  linkedShadeOptions.forEach((option) => {
    addShadeButton(option);
  });

  if (noShadeOption) {
    noShadeOption.hidden =
      currentProduct.allowNoShade !== true;
  }
}

function addShadeButton(option) {
  if (!shadeOptionsEl) return;

  const button = document.createElement("button");

  button.type = "button";
  button.className = "shade-option";
  button.dataset.shadeId = option.shadeId;

  button.innerHTML = `
    <img
      src="${option.lightsOffImage}"
      alt="${escapeHtml(option.title)}"
      onerror="this.src='/assets/placeholder.jpg';"
    >

    <span>${escapeHtml(option.title)}</span>

    <small>
      +£${Number(option.price).toFixed(2)}
    </small>
  `;

  button.addEventListener("click", () => {
    selectShade(option);
  });

  shadeOptionsEl.appendChild(button);
}

function selectShade(option) {
  selectedOption = option;
  selectedLightView = "off";

  updateSelectedShadeButton(option.shadeId);

  if (selectedShadeName) {
    selectedShadeName.textContent = option.title;
  }

  if (lightViewSelector) {
    lightViewSelector.hidden = false;
  }

  updateLightButtons();

  const matchingIndex = galleryEntries.findIndex(
    (entry) =>
      entry.shadeId === option.shadeId &&
      entry.lightView === "off"
  );

  if (matchingIndex >= 0) {
    activateGalleryEntry(matchingIndex);
  } else {
    setMainImage(
      option.lightsOffImage,
      `${currentProduct.title} with ${option.title}`
    );
  }

  updateDisplayedPrice();
  updateAddToCartAvailability();
}

function selectNoShade() {
  const firstLampImage =
    currentProduct.images?.[0] ||
    "/assets/placeholder.jpg";

  selectedOption = {
    type: "no-shade",
    shadeId: null,
    title: "No Shade",
    price: 0,
    stock: Number(currentProduct.stock || 0),
    image: firstLampImage
  };

  selectedLightView = "off";

  if (selectedShadeName) {
    selectedShadeName.textContent = "No Shade";
  }

  updateSelectedShadeButton(null);

  if (lightViewSelector) {
    lightViewSelector.hidden = true;
  }

  const lampOnlyIndex = galleryEntries.findIndex(
    (entry) => entry.option?.type === "no-shade"
  );

  if (lampOnlyIndex >= 0) {
    activateGalleryEntry(lampOnlyIndex);
  } else {
    setMainImage(
      firstLampImage,
      `${currentProduct.title} without a shade`
    );
  }

  updateDisplayedPrice();
  updateAddToCartAvailability();
}

noShadeOption?.addEventListener("click", () => {
  selectNoShade();
});

function updateSelectedShadeButton(shadeId) {
  document
    .querySelectorAll(".shade-option")
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.shadeId === shadeId
      );
    });

  noShadeOption?.classList.toggle(
    "active",
    shadeId === null &&
    selectedOption?.type === "no-shade"
  );
}

/* =========================================
   Price and stock
========================================= */

function updateDisplayedPrice() {
  const basePrice = Number(currentProduct?.price || 0);

  if (lampPriceSummary) {
    lampPriceSummary.textContent =
      `£${basePrice.toFixed(2)}`;
  }

  if (currentProduct?.productType === "shade") {
    if (priceEl) {
      priceEl.textContent = `£${basePrice.toFixed(2)}`;
    }

    if (productTotal) {
      productTotal.textContent =
        `£${basePrice.toFixed(2)}`;
    }

    if (shadePriceRow) {
      shadePriceRow.hidden = true;
    }

    return;
  }

  if (shadePriceRow) {
    shadePriceRow.hidden = false;
  }

  const shadePrice =
    selectedOption?.type === "shade"
      ? Number(selectedOption.price || 0)
      : 0;

  const total = basePrice + shadePrice;

  if (shadePriceLabel) {
    shadePriceLabel.textContent =
      selectedOption?.type === "shade"
        ? selectedOption.title
        : "No shade";
  }

  if (shadePriceSummary) {
    shadePriceSummary.textContent =
      selectedOption?.type === "shade"
        ? `+£${shadePrice.toFixed(2)}`
        : "£0.00";
  }

  if (productTotal) {
    productTotal.textContent =
      `£${total.toFixed(2)}`;
  }

  if (priceEl) {
    priceEl.textContent =
      `£${total.toFixed(2)}`;
  }
}

function setStockStatus(stock) {
  const stockNumber = Number(stock || 0);

  if (stockNumber <= 0) {
    if (stockStatusEl) {
      stockStatusEl.textContent = "Sold out";
      stockStatusEl.classList.add("sold-out");
    }

    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = "Sold out";
    }

    if (buyNowBtn) {
      buyNowBtn.disabled = true;
    }

    return;
  }

  if (stockStatusEl) {
    stockStatusEl.classList.remove("sold-out");

    stockStatusEl.textContent =
      stockNumber <= 2
        ? `Low in stock, only ${stockNumber} left`
        : "In stock";
  }

  if (addToCartBtn) {
    addToCartBtn.disabled = false;
    addToCartBtn.textContent = "Add to Basket";
  }

  if (buyNowBtn) {
    buyNowBtn.disabled = false;
  }
}

function updateAddToCartAvailability() {
  const lampStock = Number(currentProduct?.stock || 0);

  if (lampStock <= 0) {
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = "Sold out";
    }

    if (buyNowBtn) {
      buyNowBtn.disabled = true;
    }

    return;
  }

  if (
    currentProduct?.productType === "lamp" &&
    !selectedOption
  ) {
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = "Choose a shade";
    }

    if (buyNowBtn) {
      buyNowBtn.disabled = true;
    }

    return;
  }

  if (
    selectedOption?.type === "shade" &&
    Number(selectedOption.stock || 0) <= 0
  ) {
    if (addToCartBtn) {
      addToCartBtn.disabled = true;
      addToCartBtn.textContent = "Shade sold out";
    }

    if (buyNowBtn) {
      buyNowBtn.disabled = true;
    }

    return;
  }

  if (addToCartBtn) {
    addToCartBtn.disabled = false;
    addToCartBtn.textContent = "Add to Basket";
  }

  if (buyNowBtn) {
    buyNowBtn.disabled = false;
  }
}

/* =========================================
   Cart
========================================= */

function getCart() {
  try {
    return JSON.parse(
      localStorage.getItem("cart")
    ) || [];
  } catch (error) {
    console.error("Invalid cart data:", error);
    localStorage.removeItem("cart");
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem(
    "cart",
    JSON.stringify(cart)
  );
}

addToCartBtn?.addEventListener("click", () => {
  addCurrentSelectionToCart(false);
});

buyNowBtn?.addEventListener("click", () => {
  addCurrentSelectionToCart(true);
});

function addCurrentSelectionToCart(goToCheckout) {
  if (!currentProduct) return;

  if (Number(currentProduct.stock || 0) <= 0) {
    return;
  }

  if (currentProduct.productType === "shade") {
    addStandaloneShadeToCart(goToCheckout);
    return;
  }

  if (!selectedOption) {
    alert("Please select a shade option.");
    return;
  }

  addLampToCart(goToCheckout);
}

function addStandaloneShadeToCart(goToCheckout) {
  const cart = getCart();

  const cartId = `shade_${productId}`;
  const stock = Number(currentProduct.stock || 0);

  const existing = cart.find(
    (item) => item.cartId === cartId
  );

  if (existing) {
    if (existing.qty >= stock) {
      alert("No more stock is available.");
      return;
    }

    existing.qty += 1;
  } else {
    cart.push({
      cartId,
      id: productId,
      productType: "shade",
      shadeId: productId,
      lampId: null,
      title: currentProduct.title || "Shade",
      shadeName: currentProduct.title || "Shade",
      price: Number(currentProduct.price || 0),
      image:
        currentProduct.images?.[0] ||
        "/assets/placeholder.jpg",
      qty: 1,
      stock
    });
  }

  finishCartUpdate(cart, goToCheckout);
}

function addLampToCart(goToCheckout) {
  const lampStock = Number(currentProduct.stock || 0);

  const shadeStock =
    selectedOption.type === "shade"
      ? Number(selectedOption.stock || 0)
      : lampStock;

  const availableCombinationStock = Math.min(
    lampStock,
    shadeStock
  );

  if (availableCombinationStock <= 0) {
    alert("This option is currently sold out.");
    return;
  }

  const shadeId =
    selectedOption.type === "shade"
      ? selectedOption.shadeId
      : null;

  const shadeName =
    selectedOption.type === "shade"
      ? selectedOption.title
      : "No Shade";

  const shadePrice =
    selectedOption.type === "shade"
      ? Number(selectedOption.price || 0)
      : 0;

  const finalPrice =
    Number(currentProduct.price || 0) +
    shadePrice;

  const cartId = shadeId
    ? `lamp_${productId}_shade_${shadeId}`
    : `lamp_${productId}_no-shade`;

  const selectedImage =
    selectedOption.type === "shade"
      ? selectedLightView === "on"
        ? selectedOption.lightsOnImage
        : selectedOption.lightsOffImage
      : selectedOption.image;

  const cart = getCart();

  const existing = cart.find(
    (item) => item.cartId === cartId
  );

  if (existing) {
    if (existing.qty >= availableCombinationStock) {
      alert(
        "No more stock is available for this combination."
      );

      return;
    }

    existing.qty += 1;
    existing.image = selectedImage;
  } else {
    cart.push({
      cartId,
      id: productId,
      productType: "lamp",
      lampId: productId,
      shadeId,
      title: currentProduct.title || "Lamp",
      shadeName,
      lampPrice: Number(currentProduct.price || 0),
      shadePrice,
      price: finalPrice,
      image: selectedImage,
      qty: 1,
      stock: availableCombinationStock
    });
  }

  finishCartUpdate(cart, goToCheckout);
}

function finishCartUpdate(cart, goToCheckout) {
  saveCart(cart);

  window.updateCartCount?.();
  window.renderMiniCart?.();

  if (goToCheckout) {
    window.location.href = "/cart/";
    return;
  }

  if (addToCartBtn) {
    addToCartBtn.textContent = "Added to Basket";
  }

  window.setTimeout(() => {
    updateAddToCartAvailability();
  }, 1200);
}

/* =========================================
   Missing product
========================================= */

function showMissingProduct() {
  if (titleEl) {
    titleEl.textContent = "Product not found";
  }

  if (breadcrumbTitle) {
    breadcrumbTitle.textContent = "Product not found";
  }

  if (priceEl) {
    priceEl.textContent = "";
  }

  if (descriptionEl) {
    descriptionEl.textContent =
      "This product may have been removed or sold.";
  }

  if (stockStatusEl) {
    stockStatusEl.textContent = "";
  }

  if (addToCartBtn) {
    addToCartBtn.disabled = true;
    addToCartBtn.textContent = "Unavailable";
  }

  if (buyNowBtn) {
    buyNowBtn.disabled = true;
  }

  if (shadeSelector) {
    shadeSelector.style.display = "none";
  }

  if (lightViewSelector) {
    lightViewSelector.hidden = true;
  }

  galleryEntries = [
    {
      url: "/assets/placeholder.jpg",
      alt: "Product not found"
    }
  ];

  renderGalleryThumbnails();
  activateGalleryEntry(0);
}

/* =========================================
   Helpers
========================================= */

function removeDuplicateGalleryEntries(entries) {
  const usedUrls = new Set();

  return entries.filter((entry) => {
    if (!entry.url || usedUrls.has(entry.url)) {
      return false;
    }

    usedUrls.add(entry.url);
    return true;
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

loadProduct();