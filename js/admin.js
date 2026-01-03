import { auth, db } from "./firebase.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "/login";
    return;
  }

  try {
    const adminRef = doc(db, "admins", user.uid);
    const snap = await getDoc(adminRef);

    if (!snap.exists()) {
      window.location.href = "/";
      return;
    }

    document.body.style.display = "block";
  } catch (err) {
    console.error("Admin check failed:", err.message);
    window.location.href = "/";
  }
});
