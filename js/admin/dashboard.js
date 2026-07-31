import { db } from "../firebase.js";
import { initialiseAdminPage } from "./admin-shell.js";

import {
  collection,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

const lampCount =
  document.getElementById("lampCount");

const shadeCount =
  document.getElementById("shadeCount");

const orderCount =
  document.getElementById("orderCount");

const revenueTotal =
  document.getElementById("revenueTotal");

const dashboardStatus =
  document.getElementById("dashboardStatus");

async function startDashboard() {
  await initialiseAdminPage();
  await loadDashboardStatistics();
}

async function loadDashboardStatistics() {
  setDashboardStatus(
    "Loading dashboard information..."
  );

  try {
    const [
      productsSnapshot,
      ordersSnapshot
    ] = await Promise.all([
      getDocs(collection(db, "products")),
      getDocs(collection(db, "orders"))
    ]);

    let lamps = 0;
    let shades = 0;

    productsSnapshot.forEach(
      (documentSnapshot) => {
        const product =
          documentSnapshot.data();

        const productType =
          product.productType || "lamp";

        if (productType === "shade") {
          shades += 1;
        } else {
          lamps += 1;
        }
      }
    );

    let paidOrders = 0;
    let revenue = 0;

    ordersSnapshot.forEach(
      (documentSnapshot) => {
        const order =
          documentSnapshot.data();

        const paymentStatus = String(
          order.paymentStatus ||
          order.payment_status ||
          ""
        ).toLowerCase();

        const isPaid =
          paymentStatus === "paid" ||
          paymentStatus === "complete" ||
          paymentStatus === "succeeded";

        if (!isPaid) {
          return;
        }

        paidOrders += 1;

        if (
          order.total !== undefined &&
          order.total !== null
        ) {
          revenue += Number(order.total || 0);
        } else {
          revenue +=
            Number(order.amountTotal || 0) / 100;
        }
      }
    );

    if (lampCount) {
      lampCount.textContent = lamps;
    }

    if (shadeCount) {
      shadeCount.textContent = shades;
    }

    if (orderCount) {
      orderCount.textContent = paidOrders;
    }

    if (revenueTotal) {
      revenueTotal.textContent =
        `£${revenue.toFixed(2)}`;
    }

    setDashboardStatus("");
  } catch (error) {
    console.error(
      "Dashboard loading error:",
      error
    );

    if (lampCount) {
      lampCount.textContent = "0";
    }

    if (shadeCount) {
      shadeCount.textContent = "0";
    }

    if (orderCount) {
      orderCount.textContent = "0";
    }

    if (revenueTotal) {
      revenueTotal.textContent = "£0.00";
    }

    setDashboardStatus(
      "The dashboard information could not be loaded."
    );
  }
}

function setDashboardStatus(message) {
  if (!dashboardStatus) {
    return;
  }

  dashboardStatus.textContent = message;
  dashboardStatus.hidden = !message;
}

startDashboard();