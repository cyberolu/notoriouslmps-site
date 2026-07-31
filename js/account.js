import { auth, db } from "./firebase.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const userName = document.getElementById("userName");
const userEmail = document.getElementById("userEmail");
const logoutBtn = document.getElementById("logoutBtn");
const accountCartItems = document.getElementById("accountCartItems");
const accountOrders = document.getElementById("accountOrders");

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login/";
    return;
  }

  document.body.style.display = "block";

  const userRef = doc(db, "users", user.uid);
  const userSnap = await getDoc(userRef);

  if (userSnap.exists()) {
    const data = userSnap.data();
    userName.textContent = data.name || "Customer";
    userEmail.textContent = data.email || user.email;
  } else {
    userName.textContent = user.displayName || "Customer";
    userEmail.textContent = user.email;
  }

  renderMiniAccountCart();
  loadCustomerOrders(user.email);
});

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await signOut(auth);
    window.location.href = "/";
  });
}

function renderMiniAccountCart() {
  const cart = JSON.parse(localStorage.getItem("cart")) || [];

  if (!cart.length) {
    accountCartItems.innerHTML = "<p>Your basket is empty.</p>";
    return;
  }

  accountCartItems.innerHTML = "";

  cart.forEach((item) => {
    const div = document.createElement("div");
    div.className = "account-cart-item";

    div.innerHTML = `
      <strong>${item.title || "Lamp"}</strong><br>
      <small>Shade: ${item.shadeName || "No Shade"}</small><br>
      Qty: ${item.qty || 1}<br>
      £${(Number(item.price || 0) * Number(item.qty || 1)).toFixed(2)}
      <hr>
    `;

    accountCartItems.appendChild(div);
  });
}

async function loadCustomerOrders(email) {
  if (!accountOrders) {
    return;
  }

  accountOrders.innerHTML = `
    <p>Loading your orders...</p>
  `;

  try {
    const ordersQuery = query(
      collection(db, "orders"),
      where(
        "customerEmail",
        "==",
        String(email || "")
          .trim()
          .toLowerCase()
      ),
      orderBy("createdAt", "desc")
    );

    const snapshot =
      await getDocs(ordersQuery);

    if (snapshot.empty) {
      accountOrders.innerHTML = `
        <p>You have no orders yet.</p>
      `;

      return;
    }

    const orders =
      snapshot.docs.map(
        (documentSnapshot) => ({
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        })
      );

    const activeOrders =
      orders.filter((order) => {
        const status =
          normaliseOrderStatus(
            order.status ||
            order.fulfilmentStatus ||
            "processing"
          );

        return ![
          "delivered",
          "cancelled",
          "refunded"
        ].includes(status);
      });

    const previousOrders =
      orders.filter((order) => {
        const status =
          normaliseOrderStatus(
            order.status ||
            order.fulfilmentStatus ||
            "processing"
          );

        return [
          "delivered",
          "cancelled",
          "refunded"
        ].includes(status);
      });

    accountOrders.innerHTML = "";

    if (activeOrders.length > 0) {
      const activeSection =
        document.createElement("section");

      activeSection.className =
        "account-orders-section";

      activeSection.innerHTML = `
        <div class="account-orders-section-heading">
          <h3>Current Orders</h3>

          <span>
            ${activeOrders.length}
          </span>
        </div>

        <div
          class="account-active-orders"
          id="accountActiveOrders"
        ></div>
      `;

      accountOrders.appendChild(
        activeSection
      );

      const activeContainer =
        activeSection.querySelector(
          "#accountActiveOrders"
        );

      activeOrders.forEach((order) => {
        activeContainer.appendChild(
          createActiveOrderCard(order)
        );
      });
    }

    if (previousOrders.length > 0) {
      const historySection =
        document.createElement("section");

      historySection.className =
        "account-orders-section account-order-history-section";

      historySection.innerHTML = `
        <div class="account-orders-section-heading">
          <h3>Order History</h3>

          <span>
            ${previousOrders.length}
          </span>
        </div>

        <div
          class="account-order-history"
          id="accountOrderHistory"
        ></div>
      `;

      accountOrders.appendChild(
        historySection
      );

      const historyContainer =
        historySection.querySelector(
          "#accountOrderHistory"
        );

      previousOrders.forEach((order) => {
        historyContainer.appendChild(
          createOrderHistoryRow(order)
        );
      });
    }
  } catch (error) {
    console.error(
      "Customer orders error:",
      error
    );

    accountOrders.innerHTML = `
      <p>Your orders could not be loaded.</p>
    `;
  }
}

function createActiveOrderCard(order) {
  const card =
    document.createElement("article");

  card.className =
    "account-order-card";

  const status =
    normaliseOrderStatus(
      order.status ||
      order.fulfilmentStatus ||
      "processing"
    );

  const orderDate =
    formatOrderDate(
      order.createdAt
    );

  const items =
    Array.isArray(order.items)
      ? order.items
      : [];

  const itemsHtml =
    items.length > 0
      ? items
          .map(
            (item) =>
              createCustomerOrderItemHtml(
                item
              )
          )
          .join("")
      : `
        <p>
          No item information is available.
        </p>
      `;

  card.innerHTML = `
    <div class="account-order-header">

      <div>
        <p class="account-order-label">
          Order
        </p>

        <h3>
          ${escapeHtml(
            order.orderNumber ||
            shortenOrderId(order.id)
          )}
        </h3>

        <p>
          ${escapeHtml(orderDate)}
        </p>
      </div>

      <div class="account-order-total">
        <span>Total</span>

        <strong>
          £${Number(
            order.total || 0
          ).toFixed(2)}
        </strong>
      </div>

    </div>

    ${createOrderStatusHtml(status)}

    <div class="account-order-items">
      ${itemsHtml}
    </div>

    <div class="account-order-help">
      <p>
        ${
          createOrderStatusMessage(
            status
          )
        }
      </p>
    </div>
  `;

  return card;
}
function createOrderHistoryRow(order) {
  const status =
    normaliseOrderStatus(
      order.status ||
      order.fulfilmentStatus ||
      "delivered"
    );

  const row =
    document.createElement("details");

  row.className =
    `account-history-order ${status}`;

  const items =
    Array.isArray(order.items)
      ? order.items
      : [];

  const itemSummary =
    createOrderItemSummary(items);

  row.innerHTML = `
    <summary class="account-history-summary">

      <div class="account-history-status">
        <span class="account-history-status-icon">
          ${getHistoryStatusIcon(status)}
        </span>

        <div>
          <strong>
            ${escapeHtml(
              order.orderNumber ||
              shortenOrderId(order.id)
            )}
          </strong>

          <span>
            ${escapeHtml(
              formatOrderDate(
                order.createdAt
              )
            )}
          </span>
        </div>
      </div>

      <div class="account-history-product">
        ${escapeHtml(itemSummary)}
      </div>

      <div class="account-history-total">
        <strong>
          £${Number(
            order.total || 0
          ).toFixed(2)}
        </strong>

        <span>
          ${escapeHtml(
            getCustomerStatusLabel(
              status
            )
          )}
        </span>
      </div>

      <span class="account-history-arrow">
        ›
      </span>

    </summary>

    <div class="account-history-details">

      <div class="account-order-items account-history-items">
        ${
          items.length > 0
            ? items
                .map(
                  (item) =>
                    createCustomerOrderItemHtml(
                      item
                    )
                )
                .join("")
            : `
              <p>
                No item information is available.
              </p>
            `
        }
      </div>

      <p class="account-history-message">
        ${escapeHtml(
          createOrderStatusMessage(
            status
          )
        )}
      </p>

    </div>
  `;

  return row;
}

function createOrderItemSummary(items) {
  if (!items.length) {
    return "Order details unavailable";
  }

  if (items.length === 1) {
    return (
      items[0].title ||
      "One product"
    );
  }

  return `${items.length} products`;
}

function getHistoryStatusIcon(status) {
  const icons = {
    delivered: "✓",
    cancelled: "×",
    refunded: "↩"
  };

  return icons[status] || "✓";
}

function getCustomerStatusLabel(status) {
  const labels = {
    processing: "Processing",
    paid: "Payment confirmed",
    packed: "Packed",
    shipped: "Dispatched",
    dispatched: "Dispatched",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refunded: "Refunded"
  };

  return (
    labels[status] ||
    capitalise(status)
  );
}
function createCustomerOrderItemHtml(item) {
  const imageUrl =
    item.imageUrl ||
    item.image ||
    "/assets/placeholder.jpg";

  const quantity =
    Number(
      item.qty ||
      item.quantity ||
      1
    );

  return `
    <div class="account-order-item">

      <img
        src="${escapeAttribute(
          imageUrl
        )}"
        alt="${escapeAttribute(
          item.title ||
          "Purchased product"
        )}"
        onerror="this.src='/assets/placeholder.jpg';"
      >

      <div>
        <strong>
          ${escapeHtml(
            item.title ||
            "Product"
          )}
        </strong>

        <p>
          Shade:
          ${escapeHtml(
            item.shadeName ||
            "No Shade"
          )}
        </p>

        <p>
          Quantity:
          ${quantity}
        </p>

        <p>
          £${Number(
            item.lineTotal ??
            (
              Number(
                item.unitPrice ||
                item.price ||
                0
              ) *
              quantity
            )
          ).toFixed(2)}
        </p>
      </div>

    </div>
  `;
}

function createOrderStatusHtml(status) {
  if (
    status === "cancelled" ||
    status === "refunded"
  ) {
    return `
      <div class="account-order-special-status ${status}">
        ${capitalise(status)}
      </div>
    `;
  }

  const stages = [
    {
      value: "processing",
      label: "Order received"
    },
    {
      value: "paid",
      label: "Paid"
    },
    {
      value: "packed",
      label: "Packed"
    },
    {
      value: "shipped",
      label: "Dispatched"
    },
    {
      value: "delivered",
      label: "Delivered"
    }
  ];

  const activeIndex =
    getStatusIndex(status);

  return `
    <div class="account-order-progress">

      ${stages
        .map(
          (stage, index) => `
            <div
              class="account-order-stage
              ${
                index <= activeIndex
                  ? "complete"
                  : ""
              }
              ${
                index === activeIndex
                  ? "current"
                  : ""
              }"
            >
              <span class="account-order-stage-marker">
                ${
                  index < activeIndex
                    ? "✓"
                    : index + 1
                }
              </span>

              <span class="account-order-stage-label">
                ${stage.label}
              </span>
            </div>
          `
        )
        .join("")}

    </div>
  `;
}

function getStatusIndex(status) {
  const statusIndexes = {
    processing: 0,
    paid: 1,
    packed: 2,
    shipped: 3,
    dispatched: 3,
    delivered: 4
  };

  return statusIndexes[status] ?? 0;
}

function normaliseOrderStatus(value) {
  return String(value || "processing")
    .trim()
    .toLowerCase();
}

function createOrderStatusMessage(status) {
  const messages = {
    processing:
      "We have received your order and are preparing it for processing.",

    paid:
      "Your payment has been confirmed and your order is being prepared.",

    packed:
      "Your order has been packed and is waiting to be dispatched.",

    shipped:
      "Your order has been dispatched and is on its way.",

    dispatched:
      "Your order has been dispatched and is on its way.",

    delivered:
      "Your order has been marked as delivered.",

    cancelled:
      "This order has been cancelled.",

    refunded:
      "This order has been refunded."
  };

  return (
    messages[status] ||
    "Your order is currently being processed."
  );
}

function formatOrderDate(value) {
  if (
    value &&
    typeof value.toDate ===
      "function"
  ) {
    return value
      .toDate()
      .toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );
  }

  if (value) {
    const date =
      new Date(value);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date.toLocaleDateString(
        "en-GB",
        {
          day: "2-digit",
          month: "short",
          year: "numeric"
        }
      );
    }
  }

  return "Date unavailable";
}

function shortenOrderId(orderId) {
  if (!orderId) {
    return "Unknown order";
  }

  return orderId.length > 14
    ? `${orderId.slice(0, 12)}...`
    : orderId;
}

function capitalise(value) {
  if (!value) {
    return "";
  }

  return (
    value.charAt(0).toUpperCase() +
    value.slice(1)
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