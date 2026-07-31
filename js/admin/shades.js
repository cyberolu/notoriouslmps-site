import {
  db,
  storage
} from "../firebase.js";

import {
  initialiseAdminPage
} from "./admin-shell.js";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const shadeForm =
  document.getElementById("shadeForm");

const shadeFormTitle =
  document.getElementById("shadeFormTitle");

const shadeSubmitButton =
  document.getElementById("shadeSubmitButton");

const cancelShadeEditButton =
  document.getElementById("cancelShadeEditButton");

const shadeList =
  document.getElementById("shadeList");

const shadeStatus =
  document.getElementById("shadeStatus");

const existingShadeImages =
  document.getElementById("existingShadeImages");

let editingShadeId = null;
let shades = [];

async function startShadesPage() {
  await initialiseAdminPage();
  await loadShades();
}

async function loadShades() {
  setStatus("Loading shades...");

  try {
    const snapshot = await getDocs(
      collection(db, "products")
    );

    shades = snapshot.docs
      .map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      }))
      .filter(
        (product) =>
          product.productType === "shade"
      );

    renderShadeList();
    setStatus("");
  } catch (error) {
    console.error(
      "Shade loading error:",
      error
    );

    shadeList.innerHTML = `
      <p>Shades could not be loaded.</p>
    `;

    setStatus(
      "The shade information could not be loaded."
    );
  }
}

shadeForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const title =
      shadeForm.title.value.trim();

    const price =
      Number(shadeForm.price.value);

    const lampExtraPrice =
      Number(
        shadeForm.lampExtraPrice.value
      );

    const stock =
      Number(shadeForm.stock.value);

    const description =
      shadeForm.description.value.trim();

    const featured =
      shadeForm.featured.checked;

    const available =
      shadeForm.available.checked;

    const existingImages =
      parseStoredArray(
        shadeForm.existingImages.value
      );

    const imageFiles =
      Array.from(
        shadeForm.shadeImageFiles.files || []
      );

    if (!title || !description) {
      alert(
        "Please complete the shade name and description."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      alert(
        "Please enter a valid standalone price."
      );
      return;
    }

    if (
      !Number.isFinite(lampExtraPrice) ||
      lampExtraPrice < 0
    ) {
      alert(
        "Please enter a valid lamp shade price."
      );
      return;
    }

    if (
      !Number.isInteger(stock) ||
      stock < 0
    ) {
      alert(
        "Please enter a valid stock quantity."
      );
      return;
    }

    if (
      !editingShadeId &&
      existingImages.length === 0 &&
      imageFiles.length === 0
    ) {
      alert(
        "Please upload at least one shade image."
      );
      return;
    }

    try {
      setSavingState(true);

      const uploadedImages =
        await uploadImages(
          imageFiles,
          "shades"
        );

      const images = [
        ...existingImages,
        ...uploadedImages
      ];

      const shadeData = {
        productType: "shade",
        title,
        price,
        lampExtraPrice,
        stock,
        available,
        description,
        images,
        featured,
        allowNoShade: false,
        recommendedShades: []
      };

      if (editingShadeId) {
        await updateDoc(
          doc(
            db,
            "products",
            editingShadeId
          ),
          {
            ...shadeData,
            updatedAt: serverTimestamp()
          }
        );
      } else {
        await addDoc(
          collection(db, "products"),
          {
            ...shadeData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }
        );
      }

      resetShadeForm();
      await loadShades();
    } catch (error) {
      console.error(
        "Shade save error:",
        error
      );

      alert(
        error.message ||
        "The shade could not be saved."
      );
    } finally {
      setSavingState(false);
    }
  }
);

function renderShadeList() {
  if (shades.length === 0) {
    shadeList.innerHTML = `
      <p>No shades have been added yet.</p>
    `;
    return;
  }

  shadeList.innerHTML = "";

  shades.forEach((shade) => {
    const shadeCard =
      document.createElement("article");

    shadeCard.className =
      "admin-product-card";

    const thumbnail =
      shade.images?.[0] ||
      "/assets/placeholder.jpg";

    const stock =
      Number(shade.stock || 0);

    const available =
      shade.available !== false;

    shadeCard.innerHTML = `
      <div class="admin-product-image">
        <img
          src="${thumbnail}"
          alt="${escapeHtml(
            shade.title || "Shade"
          )}"
          onerror="this.src='/assets/placeholder.jpg';"
        >
      </div>

      <div class="admin-product-details">
        <h3>
          ${escapeHtml(
            shade.title || "Untitled Shade"
          )}
        </h3>

        <p>
          Standalone price:
          <strong>
            £${Number(
              shade.price || 0
            ).toFixed(2)}
          </strong>
        </p>

        <p>
          Price with lamp:
          <strong>
            +£${Number(
              shade.lampExtraPrice ??
              shade.price ??
              0
            ).toFixed(2)}
          </strong>
        </p>

        <p>
          Stock:
          <strong>${stock}</strong>
        </p>

        <p>
          Images:
          <strong>
            ${shade.images?.length || 0}
          </strong>
        </p>

        <p>
          Availability:
          <strong>
            ${
              stock <= 0
                ? "Out of stock"
                : available
                  ? "Available"
                  : "Unavailable"
            }
          </strong>
        </p>

        <p>
          Featured:
          <strong>
            ${
              shade.featured
                ? "Yes"
                : "No"
            }
          </strong>
        </p>
      </div>

      <div class="admin-product-actions">
        <button
          type="button"
          data-edit-shade
        >
          Edit
        </button>

        <button
          type="button"
          data-delete-shade
        >
          Delete
        </button>
      </div>
    `;

    shadeCard
      .querySelector("[data-edit-shade]")
      ?.addEventListener(
        "click",
        () => startShadeEdit(shade)
      );

    shadeCard
      .querySelector("[data-delete-shade]")
      ?.addEventListener(
        "click",
        () => deleteShade(shade)
      );

    shadeList.appendChild(shadeCard);
  });
}

function startShadeEdit(shade) {
  editingShadeId = shade.id;

  shadeForm.title.value =
    shade.title || "";

  shadeForm.price.value =
    Number(shade.price || 0);

  shadeForm.lampExtraPrice.value =
    Number(
      shade.lampExtraPrice ??
      shade.price ??
      0
    );

  shadeForm.stock.value =
    Number(shade.stock || 0);

  shadeForm.description.value =
    shade.description || "";

  shadeForm.featured.checked =
    Boolean(shade.featured);

  shadeForm.available.checked =
    shade.available !== false;

  shadeForm.existingImages.value =
    JSON.stringify(
      shade.images || []
    );

  renderExistingShadeImages(
    shade.images || []
  );

  shadeFormTitle.textContent =
    "Edit Shade";

  shadeSubmitButton.textContent =
    "Update shade";

  cancelShadeEditButton.hidden =
    false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteShade(shade) {
  const confirmed = confirm(
    `Delete "${shade.title}"? This may affect lamps connected to this shade.`
  );

  if (!confirmed) {
    return;
  }

  try {
    await deleteDoc(
      doc(
        db,
        "products",
        shade.id
      )
    );

    await loadShades();
  } catch (error) {
    console.error(
      "Shade delete error:",
      error
    );

    alert(
      "The shade could not be deleted."
    );
  }
}

cancelShadeEditButton?.addEventListener(
  "click",
  resetShadeForm
);

function resetShadeForm() {
  editingShadeId = null;

  shadeForm.reset();

  shadeForm.existingImages.value = "";
  shadeForm.available.checked = true;
  shadeForm.featured.checked = false;

  existingShadeImages.innerHTML = "";

  shadeFormTitle.textContent =
    "Add Shade";

  shadeSubmitButton.textContent =
    "Add shade";

  cancelShadeEditButton.hidden =
    true;
}

function renderExistingShadeImages(images) {
  existingShadeImages.innerHTML = "";

  images.forEach((imageUrl) => {
    const image =
      document.createElement("img");

    image.src = imageUrl;
    image.alt = "Existing shade";
    image.className =
      "admin-existing-image";

    existingShadeImages.appendChild(image);
  });
}

async function uploadImages(
  files,
  folder
) {
  const urls = [];

  for (const file of files) {
    const cleanName =
      sanitiseFilename(file.name);

    const uniquePart =
      typeof crypto.randomUUID ===
      "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()
            .toString(36)
            .slice(2)}`;

    const filePath =
      `${folder}/${uniquePart}-${cleanName}`;

    const fileReference =
      ref(storage, filePath);

    await uploadBytes(
      fileReference,
      file
    );

    const downloadUrl =
      await getDownloadURL(
        fileReference
      );

    urls.push(downloadUrl);
  }

  return urls;
}

function setSavingState(isSaving) {
  shadeSubmitButton.disabled =
    isSaving;

  if (isSaving) {
    shadeSubmitButton.textContent =
      "Saving...";
    return;
  }

  shadeSubmitButton.textContent =
    editingShadeId
      ? "Update shade"
      : "Add shade";
}

function setStatus(message) {
  if (!shadeStatus) {
    return;
  }

  shadeStatus.textContent = message;
  shadeStatus.hidden = !message;
}

function parseStoredArray(value) {
  if (!value) {
    return [];
  }

  try {
    const parsed =
      JSON.parse(value);

    return Array.isArray(parsed)
      ? parsed
      : [];
  } catch {
    return [];
  }
}

function sanitiseFilename(filename) {
  return filename
    .toLowerCase()
    .replace(
      /[^a-z0-9._]+/g,
      "_"
    );
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

startShadesPage();