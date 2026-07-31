import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import {
  getAuth
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  getFirestore
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  getStorage
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

// ===========================================
// Firebase Config
// ===========================================

const firebaseConfig = {
  apiKey: "AIzaSyBO9X7LfqBDAt7DKMpZnKqWIa2R3R_0r6Y",
  authDomain: "notoriouslmps-site.firebaseapp.com",
  projectId: "notoriouslmps-site",
  storageBucket: "notoriouslmps-site.firebasestorage.app",
  messagingSenderId: "768836191906",
  appId: "1:768836191906:web:b41abf69b0d4a7478d79fb"
};


const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export {
  app,
  auth,
  db,
  storage
};