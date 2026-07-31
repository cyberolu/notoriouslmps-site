import { db } from "./firebase.js";

import {
  initialiseAdminPage
} from "./admin/admin-shell.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const customersList =
  document.getElementById("customersList");

const customersStatus =
  document.getElementById("customersStatus");

async function startCustomersPage() {
  await initialiseAdminPage();
  await loadCustomers();
}

async function loadCustomers() {
  if (!customersList) {
    return;
  }

  setStatus("Loading customers...");

  try {
    const [
      usersSnapshot,
      ordersSnapshot
    ] = await Promise.all([
      getDocs(
        collection(db, "users")
      ),
      getDocs(
        collection(db, "orders")
      )
    ]);

    const customersByEmail =
      new Map();

    usersSnapshot.docs.forEach(
      (documentSnapshot) => {
        const user = {
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        };

        const email =
          normaliseEmail(user.email);

        if (!email) {
          return;
        }

        customersByEmail.set(
          email,
          {
            userId: user.id,
            name:
              user.name ||
              user.fullName ||
              "Customer",
            email,
            provider:
              user.provider ||
              "email",
            role:
              user.role ||
              "customer",
            joinedAt:
              user.createdAt || null,
            registered: true,
            orders: [],
            totalSpent: 0,
            latestOrderAt: null,
            shippingAddress: null
          }
        );
      }
    );

    ordersSnapshot.docs.forEach(
      (documentSnapshot) => {
        const order = {
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        };

        if (
          order.paymentStatus !== "paid"
        ) {
          return;
        }

        const email =
          normaliseEmail(
            order.customerEmail
          );

        if (!email) {
          return;
        }

        if (
          !customersByEmail.has(email)
        ) {
          customersByEmail.set(
            email,
            {
              userId: null,
              name:
                order.customerName ||
                "Guest customer",
              email,
              provider: "guest",
              role: "customer",
              joinedAt:
                order.createdAt || null,
              registered: false,
              orders: [],
              totalSpent: 0,
              latestOrderAt: null,
              shippingAddress:
                order.shippingAddress ||
                null
            }
          );
        }

        const customer =
          customersByEmail.get(email);

        customer.orders.push(order);

        customer.totalSpent +=
          Number(order.total || 0);

        const orderDate =
          convertTimestampToDate(
            order.createdAt
          );

        const latestDate =
          convertTimestampToDate(
            customer.latestOrderAt
          );

        if (
          orderDate &&
          (
            !latestDate ||
            orderDate > latestDate
          )
        ) {
          customer.latestOrderAt =
            order.createdAt;

          customer.shippingAddress =
            order.shippingAddress ||
            customer.shippingAddress;
        }
      }
    );

    const customers =
      Array.from(
        customersByEmail.values()
      ).sort(
        (first, second) => {
          const firstDate =
            convertTimestampToDate(
              first.latestOrderAt ||
              first.joinedAt
            );

          const secondDate =
            convertTimestampToDate(
              second.latestOrderAt ||
              second.joinedAt
            );

          return (
            Number(secondDate || 0) -
            Number(firstDate || 0)
          );
        }
      );

    if (customers.length === 0) {
      customersList.innerHTML = `
        <p>No customers yet.</p>
      `;

      setStatus("");
      return;
    }

    customersList.innerHTML = "";

    customers.forEach((customer) => {
      customersList.appendChild(
        createCustomerCard(customer)
      );
    });

    setStatus("");
  } catch (error) {
    console.error(
      "Customer load error:",
      error
    );

    customersList.innerHTML = `
      <p>
        Customers could not be loaded.
      </p>
    `;

    setStatus(
      "Customers could not be loaded."
    );
  }
}

function createCustomerCard(customer) {
  const card =
    document.createElement("article");

  card.className =
    "admin-customer-card";

  const joinedDate =
    formatDate(customer.joinedAt);

  const latestOrderDate =
    formatDate(
      customer.latestOrderAt
    );

  const orderCount =
    customer.orders.length;

  card.innerHTML = `
    <div class="admin-customer-summary">

      <div>
        <p class="admin-customer-type">
          ${
            customer.registered
              ? "Registered customer"
              : "Guest checkout"
          }
        </p>

        <h2>
          ${escapeHtml(customer.name)}
        </h2>

        <p>
          ${escapeHtml(customer.email)}
        </p>
      </div>

      <div class="admin-customer-metrics">

        <div>
          <span>Orders</span>

          <strong>
            ${orderCount}
          </strong>
        </div>

        <div>
          <span>Total spent</span>

          <strong>
            £${customer.totalSpent.toFixed(2)}
          </strong>
        </div>

        <div>
          <span>Latest order</span>

          <strong>
            ${escapeHtml(
              latestOrderDate
            )}
          </strong>
        </div>

      </div>

    </div>

    <div class="admin-customer-details">

      <p>
        <strong>Provider:</strong>
        ${escapeHtml(
          customer.provider
        )}
      </p>

      <p>
        <strong>Role:</strong>
        ${escapeHtml(
          customer.role
        )}
      </p>

      <p>
        <strong>Joined:</strong>
        ${escapeHtml(joinedDate)}
      </p>

      ${
        customer.shippingAddress
          ? `
            <p>
              <strong>
                Latest delivery address:
              </strong>

              ${escapeHtml(
                formatAddress(
                  customer.shippingAddress
                )
              )}
            </p>
          `
          : ""
      }

    </div>

    ${
      orderCount > 0
        ? createCustomerOrdersHtml(
            customer.orders
          )
        : `
          <p class="admin-customer-no-orders">
            No paid orders yet.
          </p>
        `
    }
  `;

  return card;
}

function createCustomerOrdersHtml(
  orders
) {
  const sortedOrders =
    [...orders].sort(
      (first, second) => {
        const firstDate =
          convertTimestampToDate(
            first.createdAt
          );

        const secondDate =
          convertTimestampToDate(
            second.createdAt
          );

        return (
          Number(secondDate || 0) -
          Number(firstDate || 0)
        );
      }
    );

  return `
    <details class="admin-customer-orders">

      <summary>
        View order history
      </summary>

      <div class="admin-customer-order-list">

        ${sortedOrders
          .map(
            (order) =>
              createOrderHistoryHtml(
                order
              )
          )
          .join("")}

      </div>

    </details>
  `;
}

function createOrderHistoryHtml(order) {
  const items =
    Array.isArray(order.items)
      ? order.items
      : [];

  return `
    <article class="admin-customer-order">

      <div class="admin-customer-order-heading">

        <div>
          <strong>
            ${escapeHtml(
              shortenOrderId(order.id)
            )}
          </strong>

          <p>
            ${escapeHtml(
              formatDate(order.createdAt)
            )}
          </p>
        </div>

        <div>
          <strong>
            £${Number(
              order.total || 0
            ).toFixed(2)}
          </strong>

          <p>
            ${escapeHtml(
              order.status ||
              "processing"
            )}
          </p>
        </div>

      </div>

      <div class="admin-customer-order-items">

        ${
          items.length > 0
            ? items
                .map(
                  (item) => `
                    <div class="admin-customer-order-item">

                      <img
                        src="${
                          escapeAttribute(
                            item.imageUrl ||
                            item.image ||
                            "/assets/placeholder.jpg"
                          )
                        }"
                        alt="${
                          escapeAttribute(
                            item.title ||
                            "Purchased product"
                          )
                        }"
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
                          ${Number(
                            item.qty ||
                            item.quantity ||
                            1
                          )}
                        </p>
                      </div>

                    </div>
                  `
                )
                .join("")
            : `
              <p>
                No item details available.
              </p>
            `
        }

      </div>

    </article>
  `;
}

function normaliseEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function convertTimestampToDate(value) {
  if (!value) {
    return null;
  }

  if (
    typeof value.toDate ===
    "function"
  ) {
    return value.toDate();
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
}

function formatDate(value) {
  const date =
    convertTimestampToDate(value);

  if (!date) {
    return "N/A";
  }

  return date.toLocaleDateString(
    "en-GB",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function formatAddress(address) {
  if (!address) {
    return "";
  }

  const addressData =
    address.address || address;

  return [
    addressData.line1,
    addressData.line2,
    addressData.city,
    addressData.state,
    addressData.postal_code ||
      addressData.postalCode,
    addressData.country
  ]
    .filter(Boolean)
    .join(", ");
}

function shortenOrderId(orderId) {
  if (!orderId) {
    return "Unknown order";
  }

  return orderId.length > 14
    ? `${orderId.slice(0, 12)}...`
    : orderId;
}

function setStatus(message) {
  if (!customersStatus) {
    return;
  }

  customersStatus.textContent =
    message;

  customersStatus.hidden =
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

startCustomersPage();