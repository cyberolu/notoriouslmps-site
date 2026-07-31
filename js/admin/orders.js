import { db } from "../firebase.js";

import {
  initialiseAdminPage
} from "./admin-shell.js";

import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const ordersList =
  document.getElementById("ordersList");

const ordersStatus =
  document.getElementById("ordersStatus");

async function startOrdersPage() {
  await initialiseAdminPage();
  await loadOrders();
}

async function loadOrders() {
  if (!ordersList) {
    return;
  }

  setStatus("Loading orders...");

  ordersList.innerHTML = `
    <p>Loading orders...</p>
  `;

  try {
    const ordersQuery = query(
      collection(db, "orders"),
      orderBy("createdAt", "desc")
    );

    const snapshot =
      await getDocs(ordersQuery);

    if (snapshot.empty) {
      ordersList.innerHTML = `
        <p class="order-empty">
          No orders have been placed yet.
        </p>
      `;

      setStatus("");
      return;
    }

    ordersList.innerHTML = `
      <div class="admin-table-wrap">
        <table class="admin-table orders-table">

          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody id="ordersTableBody"></tbody>

        </table>
      </div>
    `;

    const tableBody =
      document.getElementById(
        "ordersTableBody"
      );

    snapshot.forEach(
      (documentSnapshot) => {
        const order = {
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        };

        const row =
          createOrderRow(order);

        tableBody.appendChild(row);
      }
    );

    setStatus("");
  } catch (error) {
    console.error(
      "Orders loading error:",
      error
    );

    ordersList.innerHTML = `
      <p class="order-empty">
        The orders could not be loaded.
      </p>
    `;

    setStatus(
      "The orders could not be loaded."
    );
  }
}

function createOrderRow(order) {
  const row =
    document.createElement("tr");

  const date =
    order.createdAt?.toDate
      ? order.createdAt
          .toDate()
          .toLocaleString("en-GB")
      : "Date unavailable";

  const total =
    Number(order.total || 0);

  const items =
    Array.isArray(order.items)
      ? order.items
      : [];

  row.innerHTML = `
    <td>
      <strong>
        ${escapeHtml(
          order.orderNumber ||
          shortenOrderId(order.id)
        )}
      </strong>

      <br>

      <small>
        ${escapeHtml(date)}
      </small>
    </td>

    <td class="order-customer">
      <strong>
        ${escapeHtml(
          order.customerName ||
          "Guest customer"
        )}
      </strong>

      <span>
        ${escapeHtml(
          order.customerEmail ||
          "No email supplied"
        )}
      </span>
    </td>

    <td>
      <div class="order-items">
        ${
          items.length > 0
            ? items
                .map(
                  (item) =>
                    createOrderItemHtml(
                      item
                    )
                )
                .join("")
            : `
              <p class="order-empty">
                No item information found.
              </p>
            `
        }
      </div>
    </td>

    <td class="order-total">
      £${total.toFixed(2)}
    </td>

    <td>
      <select
        class="order-status-select"
        data-order-status
      >
        ${createStatusOptions(
          order.status ||
          "processing"
        )}
      </select>
    </td>
  `;

  const statusSelect =
    row.querySelector(
      "[data-order-status]"
    );

  statusSelect?.addEventListener(
    "change",
    async () => {
      await updateOrderStatus(
        order.id,
        statusSelect
      );
    }
  );

  return row;
}

function createOrderItemHtml(item) {
  const imageUrl =
    item.imageUrl ||
    item.image ||
    "/assets/placeholder.jpg";

  const title =
    item.title ||
    "Untitled product";

  const shadeName =
    item.shadeName ||
    "No Shade";

  const quantity =
    Number(item.qty || 1);

  const unitPrice =
    Number(
      item.unitPrice ??
      item.price ??
      0
    );

  return `
    <article class="order-item">

      <div class="order-item-image">
        <img
          src="${escapeAttribute(
            imageUrl
          )}"
          alt="${escapeAttribute(
            title
          )}"
          onerror="this.src='/assets/placeholder.jpg';"
        >
      </div>

      <div class="order-item-details">
        <h4>
          ${escapeHtml(title)}
        </h4>

        <p>
          Shade:
          <strong>
            ${escapeHtml(shadeName)}
          </strong>
        </p>

        <p>
          Quantity:
          <strong>${quantity}</strong>
        </p>

        <p>
          £${unitPrice.toFixed(2)} each
        </p>
      </div>

    </article>
  `;
}

async function updateOrderStatus(
  orderId,
  selectElement
) {
  const newStatus =
    selectElement.value;

  const previousStatus =
    selectElement.dataset.previousStatus ||
    "";

  try {
    selectElement.disabled = true;

    await updateDoc(
      doc(
        db,
        "orders",
        orderId
      ),
      {
        status: newStatus
      }
    );

    selectElement.dataset.previousStatus =
      newStatus;

    setStatus(
      `Order updated to ${newStatus}.`
    );

    window.setTimeout(() => {
      setStatus("");
    }, 2500);
  } catch (error) {
    console.error(
      "Order status update error:",
      error
    );

    if (previousStatus) {
      selectElement.value =
        previousStatus;
    }

    setStatus(
      "The order status could not be updated."
    );
  } finally {
    selectElement.disabled = false;
  }
}

function createStatusOptions(
  selectedStatus
) {
  const statuses = [
    "processing",
    "paid",
    "packed",
    "shipped",
    "delivered",
    "cancelled",
    "refunded"
  ];

  return statuses
    .map((status) => {
      const selected =
        status === selectedStatus
          ? "selected"
          : "";

      return `
        <option
          value="${status}"
          ${selected}
        >
          ${capitalise(status)}
        </option>
      `;
    })
    .join("");
}

function shortenOrderId(orderId) {
  if (!orderId) {
    return "Unknown order";
  }

  if (orderId.length <= 14) {
    return orderId;
  }

  return `${orderId.slice(0, 12)}...`;
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

function setStatus(message) {
  if (!ordersStatus) {
    return;
  }

  ordersStatus.textContent =
    message;

  ordersStatus.hidden =
    !message;
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

startOrdersPage();