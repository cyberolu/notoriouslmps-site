import { db } from "./firebase.js";

import {
  collection,
  getDocs,
  orderBy,
  query
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const productGrid =
  document.getElementById("productGrid");

const PRODUCTS_PER_PAGE = 12;

let allProducts = [];
let lamps = [];
let shades = [];

let firstPairingByLamp =
  new Map();

let activeCategory = "lamp";
let currentPage = 1;
let searchTerm = "";
let sortValue = "newest";

async function loadProducts() {
  if (!productGrid) {
    return;
  }

  productGrid.innerHTML = `
    <p>Loading products...</p>
  `;

  try {
    const [
      productsSnapshot,
      pairingsSnapshot
    ] = await Promise.all([
      getDocs(
        query(
          collection(db, "products"),
          orderBy("createdAt", "desc")
        )
      ),

      getDocs(
        collection(
          db,
          "lampShadePairings"
        )
      )
    ]);

    if (productsSnapshot.empty) {
      productGrid.innerHTML = `
        <p>
          No products are available at the moment.
        </p>
      `;

      return;
    }

    allProducts =
      productsSnapshot.docs.map(
        (documentSnapshot) => {
          const data =
            documentSnapshot.data();

          return {
            id: documentSnapshot.id,
            ...data,
            productType:
              data.productType ||
              "lamp"
          };
        }
      );

    createFirstPairingMap(
      pairingsSnapshot
    );

    lamps = allProducts.filter(
      (product) =>
        product.productType === "lamp"
    );

    shades = allProducts.filter(
      (product) =>
        product.productType === "shade"
    );

    if (
      lamps.length === 0 &&
      shades.length > 0
    ) {
      activeCategory = "shade";
    }

    renderShop();
  } catch (error) {
    console.error(
      "Products loading error:",
      error
    );

    productGrid.innerHTML = `
      <p>
        Sorry, we could not load the products.
        Please try again later.
      </p>
    `;
  }
}

function createFirstPairingMap(
  pairingsSnapshot
) {
  firstPairingByLamp =
    new Map();

  const pairings =
    pairingsSnapshot.docs.map(
      (documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      })
    );

  pairings.sort(
    (first, second) => {
      const firstOrder =
        Number(
          first.displayOrder ??
          first.sortOrder ??
          9999
        );

      const secondOrder =
        Number(
          second.displayOrder ??
          second.sortOrder ??
          9999
        );

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return String(
        first.shadeTitle || ""
      ).localeCompare(
        String(
          second.shadeTitle || ""
        )
      );
    }
  );

  pairings.forEach((pairing) => {
    if (!pairing.lampId) {
      return;
    }

    if (
      firstPairingByLamp.has(
        pairing.lampId
      )
    ) {
      return;
    }

    firstPairingByLamp.set(
      pairing.lampId,
      pairing
    );
  });
}

function renderShop() {
  productGrid.innerHTML = `
    <section class="shop-browser">

      <div class="shop-category-tabs">

        <button
          type="button"
          class="shop-category-tab"
          data-shop-category="lamp"
        >
          Lamps
          <span>${lamps.length}</span>
        </button>

        <button
          type="button"
          class="shop-category-tab"
          data-shop-category="shade"
        >
          Shades
          <span>${shades.length}</span>
        </button>

      </div>

      <div class="shop-controls">

        <label class="shop-search">
          <span>Search</span>

          <input
            type="search"
            id="shopSearchInput"
            placeholder="Search products"
            autocomplete="off"
          >
        </label>

        <label class="shop-sort">
          <span>Sort by</span>

          <select id="shopSortSelect">
            <option value="newest">
              Newest
            </option>

            <option value="name-asc">
              Name, A to Z
            </option>

            <option value="name-desc">
              Name, Z to A
            </option>

            <option value="price-low">
              Price, low to high
            </option>

            <option value="price-high">
              Price, high to low
            </option>
          </select>
        </label>

      </div>

      <div class="shop-results-summary">
        <h2 id="shopCategoryHeading"></h2>

        <p id="shopResultsCount"></p>
      </div>

      <div
        id="shopProductCards"
        class="shop-product-grid"
      ></div>

      <nav
        id="shopPagination"
        class="shop-pagination"
        aria-label="Shop pages"
      ></nav>

    </section>
  `;

  attachShopControls();
  renderActiveCategory();
}

function attachShopControls() {
  document
    .querySelectorAll(
      "[data-shop-category]"
    )
    .forEach((button) => {
      button.addEventListener(
        "click",
        () => {
          activeCategory =
            button.dataset.shopCategory;

          currentPage = 1;
          searchTerm = "";

          const searchInput =
            document.getElementById(
              "shopSearchInput"
            );

          if (searchInput) {
            searchInput.value = "";
          }

          renderActiveCategory();
        }
      );
    });

  const searchInput =
    document.getElementById(
      "shopSearchInput"
    );

  searchInput?.addEventListener(
    "input",
    () => {
      searchTerm =
        searchInput.value
          .trim()
          .toLowerCase();

      currentPage = 1;

      renderActiveCategory();
    }
  );

  const sortSelect =
    document.getElementById(
      "shopSortSelect"
    );

  sortSelect?.addEventListener(
    "change",
    () => {
      sortValue =
        sortSelect.value;

      currentPage = 1;

      renderActiveCategory();
    }
  );
}

function renderActiveCategory() {
  updateCategoryTabs();

  const heading =
    document.getElementById(
      "shopCategoryHeading"
    );

  const resultsCount =
    document.getElementById(
      "shopResultsCount"
    );

  const cardsContainer =
    document.getElementById(
      "shopProductCards"
    );

  const pagination =
    document.getElementById(
      "shopPagination"
    );

  if (
    !heading ||
    !resultsCount ||
    !cardsContainer ||
    !pagination
  ) {
    return;
  }

  heading.textContent =
    activeCategory === "lamp"
      ? "Lamps"
      : "Shades";

  const sourceProducts =
    activeCategory === "lamp"
      ? lamps
      : shades;

  const filteredProducts =
    filterAndSortProducts(
      sourceProducts
    );

  const totalProducts =
    filteredProducts.length;

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        totalProducts /
        PRODUCTS_PER_PAGE
      )
    );

  if (currentPage > totalPages) {
    currentPage = totalPages;
  }

  const startIndex =
    (currentPage - 1) *
    PRODUCTS_PER_PAGE;

  const visibleProducts =
    filteredProducts.slice(
      startIndex,
      startIndex +
      PRODUCTS_PER_PAGE
    );

  resultsCount.textContent =
    createResultsText(
      totalProducts,
      startIndex,
      visibleProducts.length
    );

  cardsContainer.innerHTML = "";

  if (visibleProducts.length === 0) {
    cardsContainer.innerHTML = `
      <p class="shop-no-results">
        No ${
          activeCategory === "lamp"
            ? "lamps"
            : "shades"
        } match your search.
      </p>
    `;

    pagination.innerHTML = "";
    return;
  }

  visibleProducts.forEach(
    (product) => {
      cardsContainer.appendChild(
        createProductCard(product)
      );
    }
  );

  renderPagination(
    totalPages
  );
}

function updateCategoryTabs() {
  document
    .querySelectorAll(
      "[data-shop-category]"
    )
    .forEach((button) => {
      button.classList.toggle(
        "active",
        button.dataset.shopCategory ===
        activeCategory
      );
    });
}

function filterAndSortProducts(
  products
) {
  const filtered =
    products.filter((product) => {
      if (!searchTerm) {
        return true;
      }

      const searchableText = [
        product.title,
        product.description,
        product.productType
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(
        searchTerm
      );
    });

  return [...filtered].sort(
    (first, second) => {
      const firstTitle =
        String(
          first.title || ""
        );

      const secondTitle =
        String(
          second.title || ""
        );

      const firstPrice =
        Number(
          first.price || 0
        );

      const secondPrice =
        Number(
          second.price || 0
        );

      if (sortValue === "name-asc") {
        return firstTitle.localeCompare(
          secondTitle
        );
      }

      if (sortValue === "name-desc") {
        return secondTitle.localeCompare(
          firstTitle
        );
      }

      if (sortValue === "price-low") {
        return firstPrice - secondPrice;
      }

      if (sortValue === "price-high") {
        return secondPrice - firstPrice;
      }

      return 0;
    }
  );
}

function createResultsText(
  totalProducts,
  startIndex,
  visibleCount
) {
  if (totalProducts === 0) {
    return "No products found";
  }

  const firstNumber =
    startIndex + 1;

  const lastNumber =
    startIndex + visibleCount;

  return (
    `Showing ${firstNumber} to ` +
    `${lastNumber} of ` +
    `${totalProducts}`
  );
}

function renderPagination(
  totalPages
) {
  const pagination =
    document.getElementById(
      "shopPagination"
    );

  if (!pagination) {
    return;
  }

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  pagination.innerHTML = "";

  const previousButton =
    createPaginationButton(
      "Previous",
      currentPage - 1,
      currentPage === 1
    );

  pagination.appendChild(
    previousButton
  );

  getVisiblePageNumbers(
    totalPages,
    currentPage
  ).forEach((page) => {
    if (page === "...") {
      const dots =
        document.createElement("span");

      dots.className =
        "shop-pagination-dots";

      dots.textContent = "...";

      pagination.appendChild(dots);
      return;
    }

    const pageButton =
      createPaginationButton(
        String(page),
        page,
        false
      );

    if (page === currentPage) {
      pageButton.classList.add(
        "active"
      );

      pageButton.setAttribute(
        "aria-current",
        "page"
      );
    }

    pagination.appendChild(
      pageButton
    );
  });

  const nextButton =
    createPaginationButton(
      "Next",
      currentPage + 1,
      currentPage === totalPages
    );

  pagination.appendChild(
    nextButton
  );
}

function createPaginationButton(
  label,
  page,
  disabled
) {
  const button =
    document.createElement("button");

  button.type = "button";
  button.className =
    "shop-pagination-button";

  button.textContent = label;
  button.disabled = disabled;

  button.addEventListener(
    "click",
    () => {
      currentPage = page;

      renderActiveCategory();

      productGrid.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  );

  return button;
}

function getVisiblePageNumbers(
  totalPages,
  activePage
) {
  if (totalPages <= 7) {
    return Array.from(
      {
        length: totalPages
      },
      (_, index) =>
        index + 1
    );
  }

  if (activePage <= 4) {
    return [
      1,
      2,
      3,
      4,
      5,
      "...",
      totalPages
    ];
  }

  if (
    activePage >=
    totalPages - 3
  ) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }

  return [
    1,
    "...",
    activePage - 1,
    activePage,
    activePage + 1,
    "...",
    totalPages
  ];
}

function createProductCard(product) {
  const card =
    document.createElement("a");

  card.className =
    "product-card";

  card.href =
    `/product/?id=${product.id}`;

  const imageUrl =
    getProductCardImage(product);

  const productLabel =
    product.productType === "shade"
      ? "Shade"
      : "Lamp";

  const stock =
    Number(
      product.stock || 0
    );

  card.innerHTML = `
    <img
      src="${escapeAttribute(
        imageUrl
      )}"
      alt="${escapeAttribute(
        product.title ||
        `Handmade ${productLabel}`
      )}"
      onerror="this.src='/assets/placeholder.jpg';"
    >

    <div class="product-card-content">

      <p class="product-card-type">
        ${productLabel}
      </p>

      <h3>
        ${escapeHtml(
          product.title ||
          `Untitled ${productLabel}`
        )}
      </h3>

      <p class="price">
        £${Number(
          product.price || 0
        ).toFixed(2)}
      </p>

      <p class="product-card-stock">
        ${
          stock <= 0
            ? "Sold out"
            : stock <= 2
              ? `Only ${stock} left`
              : "In stock"
        }
      </p>

    </div>
  `;

  return card;
}

function getProductCardImage(
  product
) {
  if (
    product.productType === "lamp"
  ) {
    const firstPairing =
      firstPairingByLamp.get(
        product.id
      );

    if (
      firstPairing?.lightsOffImage
    ) {
      return firstPairing
        .lightsOffImage;
    }

    if (
      firstPairing?.lightsOnImage
    ) {
      return firstPairing
        .lightsOnImage;
    }
  }

  return (
    product.images?.[0] ||
    "/assets/placeholder.jpg"
  );
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

loadProducts();