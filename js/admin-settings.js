import { auth } from "./firebase.js";
import { isAdmin } from "./auth.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login/";
    return;
  }

  if (!(await isAdmin(user.uid))) {
    await signOut(auth);
    window.location.href = "/";
    return;
  }

  document.body.style.display = "block";
});