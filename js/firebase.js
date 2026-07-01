
// ===========================================
// Firebase Configuration
// Notorious Lamps
// ===========================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";

import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

import {
  initializeFirestore,
  persistentLocalCache,
  persistentSingleTabManager
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";


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


// ===========================================
// Initialise Firebase
// ===========================================

const app = initializeApp(firebaseConfig);


// ===========================================
// Authentication
// ===========================================

const auth = getAuth(app);


// ===========================================
// Firestore
// ===========================================

const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentSingleTabManager()
  })
});
const storage = getStorage(app);

// ===========================================
// Exports
// ===========================================

export {
  app,
  auth,
  db,
   storage
};