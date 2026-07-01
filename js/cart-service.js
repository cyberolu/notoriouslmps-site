import { auth, db } from "./firebase.js";

import {
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  collection
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

export function getLocalCart() {
  try {
    return JSON.parse(localStorage.getItem("cart")) || [];
  } catch {
    localStorage.removeItem("cart");
    return [];
  }
}

export function saveLocalCart(cart) {
  localStorage.setItem("cart", JSON.stringify(cart));
}

export async function getFirebaseCart(uid) {
  const snap = await getDocs(collection(db, "users", uid, "cart"));

  return snap.docs.map((docSnap) => ({
    id: docSnap.id,
    ...docSnap.data()
  }));
}

export async function saveFirebaseCartItem(uid, item) {
  await setDoc(doc(db, "users", uid, "cart", item.id), item);
}

export async function removeFirebaseCartItem(uid, productId) {
  await deleteDoc(doc(db, "users", uid, "cart", productId));
}

export async function syncLocalCartToFirebase() {
  const user = auth.currentUser;
  if (!user) return;

  const localCart = getLocalCart();

  for (const item of localCart) {
    await saveFirebaseCartItem(user.uid, item);
  }
}