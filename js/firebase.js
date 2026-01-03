// Firebase CDN module imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBO9X7LfqBDAt7DKMpZnKqWIa2R3R_0r6Y",
  authDomain: "notoriouslmps-site.firebaseapp.com",
  projectId: "notoriouslmps-site",
  messagingSenderId: "768836191906",
  appId: "1:768836191906:web:b41abf69b0d4a7478d79fb"
};

// Initialise Firebase
const app = initializeApp(firebaseConfig);

// Services we actually use
const auth = getAuth(app);
const db = getFirestore(app);

// Export for other JS files
export { auth, db };
