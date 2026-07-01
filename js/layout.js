import { auth } from "./firebase.js";
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const headerRoot = document.getElementById("siteHeader");
const footerRoot = document.getElementById("siteFooter");

if (headerRoot) {
  onAuthStateChanged(auth, (user) => {
    headerRoot.innerHTML = `
      <header class="site-header">
        <div class="logo">
          <a href="/">
            <img src="/assets/logo.png" alt="Notorious Lamps" class="site-logo">
          </a>
        </div>

        <nav class="nav">
          <a href="/shop/">Shop</a>
          <a href="/about/">About</a>
          <a href="/contact/">Contact</a>

          ${
            user
              ? `<a href="/account/" id="accountGreeting">Hi, Customer</a>
                <button type="button" id="logoutBtn" class="nav-button">Logout</button>`
              : `<a href="/login/">Login</a>
                <a href="/register/">Create Account</a>`
          }

          <div class="cart-wrapper">
            <a href="/cart/" class="cart-link">
              🛒 Cart
              <span class="cart-count" id="cartCount">0</span>
            </a>

            <div class="mini-cart" id="miniCart">
              <div class="mini-cart-items" id="miniCartItems"></div>
              <div class="mini-cart-footer">
                <a href="/cart/" class="view-cart-btn">View cart</a>
              </div>
            </div>
          </div>
        </nav>
      </header>
    `;

    const logoutBtn = document.getElementById("logoutBtn");

    const accountGreeting = document.getElementById("accountGreeting");

    if (user && accountGreeting) {
      const firstName =
        user.displayName?.split(" ")[0] ||
        user.email?.split("@")[0] ||
        "Customer";

      accountGreeting.textContent = `Hi, ${firstName}`;
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "/";
      });
    }

    if (window.updateCartCount) window.updateCartCount();
    if (window.renderMiniCart) window.renderMiniCart();
  });
}

if (footerRoot) {
  footerRoot.innerHTML = `
    <footer class="site-footer">
      <p>© Notorious Lamps · Handmade in Scotland</p>
    </footer>
  `;
}