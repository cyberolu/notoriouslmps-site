import { auth } from "../firebase.js";
import { isAdmin } from "../auth.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

function renderAdminHeader() {
  const adminHeader =
    document.getElementById("adminHeader");

  if (!adminHeader) {
    return;
  }

  adminHeader.innerHTML = `
    <header class="admin-header">
      <div class="admin-header-inner">

        <a href="/admin/" class="admin-brand">
          <span class="admin-brand-name">
            LMPs
          </span>

          <span class="admin-brand-description">
            Admin
          </span>
        </a>

        <nav class="admin-navigation">
          <a href="/admin/">Dashboard</a>
          <a href="/admin/lamps/">Lamps</a>
          <a href="/admin/shades/">Shades</a>
          <a href="/admin/orders/">Orders</a>
          <a href="/admin/customers/">Customers</a>
          <a href="/">View Store</a>

          <button
            type="button"
            id="adminLogoutBtn"
            class="admin-logout-button"
          >
            Log out
          </button>
        </nav>

      </div>
    </header>
  `;

  markCurrentAdminPage();
  attachLogoutButton();
}

function markCurrentAdminPage() {
  const currentPath = window.location.pathname;

  document
    .querySelectorAll(".admin-navigation a")
    .forEach((link) => {
      const linkPath = new URL(
        link.href,
        window.location.origin
      ).pathname;

      const isDashboard =
        currentPath === "/admin/" &&
        linkPath === "/admin/";

      const isSection =
        linkPath !== "/admin/" &&
        currentPath.startsWith(linkPath);

      link.classList.toggle(
        "active",
        isDashboard || isSection
      );
    });
}

function attachLogoutButton() {
  const logoutButton =
    document.getElementById("adminLogoutBtn");

  logoutButton?.addEventListener(
    "click",
    async () => {
      try {
        logoutButton.disabled = true;
        logoutButton.textContent = "Logging out...";

        await signOut(auth);

        window.location.href = "/";
      } catch (error) {
        console.error(
          "Admin logout error:",
          error
        );

        logoutButton.disabled = false;
        logoutButton.textContent = "Log out";

        alert(
          "You could not be logged out. Please try again."
        );
      }
    }
  );
}

export function initialiseAdminPage() {
  return new Promise((resolve) => {
    onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          window.location.href = "/login/";
          return;
        }

        try {
          const authorised = await isAdmin(user.uid);

          if (!authorised) {
            alert(
              "You are not authorised to access the admin area."
            );

            await signOut(auth);

            window.location.href = "/";
            return;
          }

          renderAdminHeader();

          document.body.style.display = "block";

          resolve(user);
        } catch (error) {
          console.error(
            "Admin authentication error:",
            error
          );

          alert(
            "The admin area could not be loaded."
          );

          window.location.href = "/";
        }
      }
    );
  });
}