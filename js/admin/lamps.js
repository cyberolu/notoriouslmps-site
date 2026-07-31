import {
  db,
  storage
} from "../firebase.js";

import {
  initialiseAdminPage
} from "./admin-shell.js";

import {
  collection,
  getDocs,
  updateDoc,
  deleteField,
  doc,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js";

const lampForm =
  document.getElementById("lampForm");

const lampFormTitle =
  document.getElementById("lampFormTitle");

const lampSubmitButton =
  document.getElementById("lampSubmitButton");

const cancelLampEditButton =
  document.getElementById("cancelLampEditButton");

const lampList =
  document.getElementById("lampList");

const lampStatus =
  document.getElementById("lampStatus");

const availableShadesList =
  document.getElementById("availableShadesList");

const selectedShadePairings =
  document.getElementById("selectedShadePairings");

let editingLampId = null;
let lamps = [];
let shades = [];
let pairingsByLampId = new Map();

async function startLampsPage() {
  await initialiseAdminPage();
  await loadProducts();
}

async function loadProducts() {
  setStatus("Loading lamps and shades...");

  try {
    const [
      snapshot,
      pairingsSnapshot
    ] = await Promise.all([
      getDocs(
        collection(db, "products")
      ),
      getDocs(
        collection(
          db,
          "lampShadePairings"
        )
      )
    ]);

    const products = snapshot.docs.map(
      (documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data()
      })
    );

    lamps = products.filter(
      (product) =>
        !product.productType ||
        product.productType === "lamp"
    );

    shades = products.filter(
      (product) =>
        product.productType === "shade"
    );

    pairingsByLampId = new Map();

    pairingsSnapshot.docs.forEach(
      (documentSnapshot) => {
        const pairing = {
          id: documentSnapshot.id,
          ...documentSnapshot.data()
        };

        if (!pairing.lampId) {
          return;
        }

        const lampPairings =
          pairingsByLampId.get(
            pairing.lampId
          ) || [];

        lampPairings.push(pairing);

        pairingsByLampId.set(
          pairing.lampId,
          lampPairings
        );
      }
    );

    renderLampList();
    renderAvailableShades([]);

    setStatus("");
  } catch (error) {
    console.error(
      "Products loading error:",
      error
    );

    lampList.innerHTML = `
      <p>Lamps could not be loaded.</p>
    `;

    setStatus(
      "The lamp information could not be loaded."
    );
  }
}

lampForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    const title =
      lampForm.title.value.trim();

    const price =
      Number(lampForm.price.value);

    const stock =
      Number(lampForm.stock.value);

    const description =
      lampForm.description.value.trim();

    const featured =
      lampForm.featured.checked;

    const allowNoShade =
      lampForm.allowNoShade.checked;

    const existingImages =
      parseStoredArray(
        lampForm.existingImages.value
      );

    const imageFiles =
      Array.from(
        lampForm.lampImageFiles.files || []
      );

    if (!title || !description) {
      alert(
        "Please complete the lamp title and description."
      );
      return;
    }

    if (
      !Number.isFinite(price) ||
      price < 0
    ) {
      alert(
        "Please enter a valid lamp price."
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
      !editingLampId &&
      existingImages.length === 0 &&
      imageFiles.length === 0
    ) {
      alert(
        "Please upload at least one lamp image."
      );
      return;
    }

    try {
      setSavingState(true);

      const uploadedImages =
        await uploadImages(
          imageFiles,
          "lamps"
        );

      const images = [
        ...existingImages,
        ...uploadedImages
      ];

      const lampReference =
        editingLampId
          ? doc(
              db,
              "products",
              editingLampId
            )
          : doc(
              collection(
                db,
                "products"
              )
            );

      const lampId =
        lampReference.id;

      const selectedPairings =
        await collectRecommendedShadePairings(
          lampId
        );

      if (
        !allowNoShade &&
        selectedPairings.length === 0
      ) {
        alert(
          "Select at least one shade or allow the lamp to be purchased without a shade."
        );

        setSavingState(false);
        return;
      }

      const lampData = {
        productType: "lamp",
        title,
        price,
        stock,
        description,
        featured,
        allowNoShade,
        images
      };

      if (editingLampId) {
        await updateDoc(
          lampReference,
          {
            ...lampData,
            recommendedShades:
              deleteField(),
            updatedAt:
              serverTimestamp()
          }
        );
      } else {
        await setDoc(
          lampReference,
          {
            ...lampData,
            createdAt:
              serverTimestamp(),
            updatedAt:
              serverTimestamp()
          }
        );
      }

await syncLampShadePairings({
  lampId,
  lampTitle: title,
  selectedPairings
});

resetLampForm();

      resetLampForm();
      await loadProducts();
    } catch (error) {
      console.error(
        "Lamp save error:",
        error
      );

      alert(
        error.message ||
        "The lamp could not be saved."
      );
    } finally {
      setSavingState(false);
    }
  }
);

function renderLampList() {
  if (lamps.length === 0) {
    lampList.innerHTML = `
      <p>No lamps have been added yet.</p>
    `;
    return;
  }

  lampList.innerHTML = "";

  lamps.forEach((lamp) => {
    const lampCard =
      document.createElement("article");

    lampCard.className =
      "admin-product-card";

    const thumbnail =
      lamp.images?.[0] ||
      "/assets/placeholder.jpg";

    const pairingCount =
      (
        pairingsByLampId.get(
          lamp.id
        ) || []
      ).length;

    lampCard.innerHTML = `
      <div class="admin-product-image">
        <img
          src="${thumbnail}"
          alt="${escapeHtml(
            lamp.title || "Lamp"
          )}"
          onerror="this.src='/assets/placeholder.jpg';"
        >
      </div>

      <div class="admin-product-details">
        <h3>
          ${escapeHtml(
            lamp.title || "Untitled Lamp"
          )}
        </h3>

        <p>
          Price:
          <strong>
            £${Number(
              lamp.price || 0
            ).toFixed(2)}
          </strong>
        </p>

        <p>
          Stock:
          <strong>
            ${Number(lamp.stock || 0)}
          </strong>
        </p>

        <p>
          Images:
          <strong>
            ${lamp.images?.length || 0}
          </strong>
        </p>

        <p>
          Linked shades:
          <strong>
            ${pairingCount}
          </strong>
        </p>

        <p>
          Without shade:
          <strong>
            ${
              lamp.allowNoShade
                ? "Allowed"
                : "Not allowed"
            }
          </strong>
        </p>

        <p>
          Featured:
          <strong>
            ${
              lamp.featured
                ? "Yes"
                : "No"
            }
          </strong>
        </p>
      </div>

      <div class="admin-product-actions">
        <button
          type="button"
          data-edit-lamp
        >
          Edit
        </button>

        <button
          type="button"
          data-delete-lamp
        >
          Delete
        </button>
      </div>
    `;

    lampCard
      .querySelector("[data-edit-lamp]")
      ?.addEventListener(
        "click",
        () => startLampEdit(lamp)
      );

    lampCard
      .querySelector("[data-delete-lamp]")
      ?.addEventListener(
        "click",
        () => deleteLamp(lamp)
      );

    lampList.appendChild(lampCard);
  });
}

function renderAvailableShades(
  existingPairings = []
) {
  availableShadesList.innerHTML = "";
  selectedShadePairings.innerHTML = "";

  if (shades.length === 0) {
    availableShadesList.innerHTML = `
      <p>
        No shades are available yet.
        Add shades before connecting them
        to a lamp.
      </p>
    `;
    return;
  }

  shades.forEach((shade) => {
    const existingPairing =
      existingPairings.find(
        (pairing) =>
          pairing.shadeId === shade.id
      );

    const stock =
      Number(shade.stock || 0);

    const isAvailable =
      shade.available !== false &&
      stock > 0;

    const shadeCard =
      document.createElement("article");

    shadeCard.className =
      "available-shade-card";

    shadeCard.innerHTML = `
      <div class="available-shade-image">
        <img
          src="${
            shade.images?.[0] ||
            "/assets/placeholder.jpg"
          }"
          alt="${escapeHtml(
            shade.title || "Shade"
          )}"
          onerror="this.src='/assets/placeholder.jpg';"
        >
      </div>

      <div class="available-shade-details">
        <h4>
          ${escapeHtml(
            shade.title || "Untitled Shade"
          )}
        </h4>

        <p>
          Lamp price:
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
          Status:
          <strong>
            ${
              isAvailable
                ? "Available"
                : stock <= 0
                  ? "Out of stock"
                  : "Unavailable"
            }
          </strong>
        </p>
      </div>

      <label class="available-shade-select">
        <input
          type="checkbox"
          class="recommended-shade-checkbox"
          value="${shade.id}"
          ${
            existingPairing
              ? "checked"
              : ""
          }
          ${
            !isAvailable &&
            !existingPairing
              ? "disabled"
              : ""
          }
        >

        Link this shade
      </label>
    `;

    const checkbox =
      shadeCard.querySelector(
        ".recommended-shade-checkbox"
      );

    checkbox?.addEventListener(
      "change",
      () => {
        if (checkbox.checked) {
          addPairingEditor(
            shade,
            existingPairing
          );
        } else {
          removePairingEditor(
            shade.id
          );
        }
      }
    );

    availableShadesList.appendChild(
      shadeCard
    );

    if (existingPairing) {
      addPairingEditor(
        shade,
        existingPairing
      );
    }
  });
}

function addPairingEditor(
  shade,
  existingPairing = {}
) {
  const existingEditor =
    selectedShadePairings.querySelector(
      `[data-pairing-shade-id="${shade.id}"]`
    );

  if (existingEditor) {
    return;
  }

  const lightsOffImage =
    existingPairing.lightsOffImage || "";

  const lightsOnImage =
    existingPairing.lightsOnImage || "";

  const pairingCard =
    document.createElement("article");

  pairingCard.className =
    "shade-pairing-card";

  pairingCard.dataset.pairingShadeId =
    shade.id;

  pairingCard.innerHTML = `
    <div class="shade-pairing-heading">
      <img
        src="${
          shade.images?.[0] ||
          "/assets/placeholder.jpg"
        }"
        alt="${escapeHtml(
          shade.title || "Shade"
        )}"
        onerror="this.src='/assets/placeholder.jpg';"
      >

      <div>
        <h4>
          ${escapeHtml(
            shade.title || "Untitled Shade"
          )}
        </h4>

        <p>
          Upload the lamp with this shade
          switched off and switched on.
        </p>
      </div>
    </div>

    <div class="pairing-image-grid">

      <div>
        <label>
          Lights off photograph

          <input
            type="file"
            class="pairing-lights-off-file"
            accept="image/*"
          >
        </label>

        <input
          type="hidden"
          class="existing-lights-off-image"
          value="${escapeAttribute(
            lightsOffImage
          )}"
        >

        ${
          lightsOffImage
            ? `
              <img
                src="${lightsOffImage}"
                alt="Lamp with shade switched off"
                class="pairing-preview"
              >
            `
            : ""
        }
      </div>

      <div>
        <label>
          Lights on photograph

          <input
            type="file"
            class="pairing-lights-on-file"
            accept="image/*"
          >
        </label>

        <input
          type="hidden"
          class="existing-lights-on-image"
          value="${escapeAttribute(
            lightsOnImage
          )}"
        >

        ${
          lightsOnImage
            ? `
              <img
                src="${lightsOnImage}"
                alt="Lamp with shade switched on"
                class="pairing-preview"
              >
            `
            : ""
        }
      </div>

    </div>
  `;

  selectedShadePairings.appendChild(
    pairingCard
  );
}

function removePairingEditor(shadeId) {
  selectedShadePairings
    .querySelector(
      `[data-pairing-shade-id="${shadeId}"]`
    )
    ?.remove();
}

async function collectRecommendedShadePairings(
  lampId
) {
  const pairingCards =
    selectedShadePairings.querySelectorAll(
      ".shade-pairing-card"
    );

  const pairings = [];

  for (const card of pairingCards) {
    const shadeId =
      card.dataset.pairingShadeId;

    const shade = shades.find(
      (item) => item.id === shadeId
    );

    if (!shade) {
      continue;
    }

    const lightsOffFile =
      card.querySelector(
        ".pairing-lights-off-file"
      )?.files?.[0];

    const lightsOnFile =
      card.querySelector(
        ".pairing-lights-on-file"
      )?.files?.[0];

    let lightsOffImage =
      card.querySelector(
        ".existing-lights-off-image"
      )?.value || "";

    let lightsOnImage =
      card.querySelector(
        ".existing-lights-on-image"
      )?.value || "";

    if (lightsOffFile) {
      const uploaded =
        await uploadImages(
          [lightsOffFile],
          `lamp-pairings/${lampId}/${shadeId}/lights-off`
        );

      lightsOffImage =
        uploaded[0] || "";
    }

    if (lightsOnFile) {
      const uploaded =
        await uploadImages(
          [lightsOnFile],
          `lamp-pairings/${lampId}/${shadeId}/lights-on`
        );

      lightsOnImage =
        uploaded[0] || "";
    }

    if (
      !lightsOffImage ||
      !lightsOnImage
    ) {
      throw new Error(
        `Both photographs are required for ${shade.title}.`
      );
    }

    pairings.push({
      shadeId,
      shadeTitle:
        shade.title || "Untitled Shade",
      lightsOffImage,
      lightsOnImage
    });
  }

  return pairings;
}
async function syncLampShadePairings({
  lampId,
  lampTitle,
  selectedPairings
}) {
  const existingSnapshot =
    await getDocs(
      query(
        collection(
          db,
          "lampShadePairings"
        ),
        where(
          "lampId",
          "==",
          lampId
        )
      )
    );

  const existingIds =
    new Set(
      existingSnapshot.docs.map(
        (documentSnapshot) =>
          documentSnapshot.id
      )
    );

  const selectedIds =
    new Set(
      selectedPairings.map(
        (pairing) =>
          `${lampId}_${pairing.shadeId}`
      )
    );

  const batch =
    writeBatch(db);

  existingSnapshot.docs.forEach(
    (documentSnapshot) => {
      if (
        !selectedIds.has(
          documentSnapshot.id
        )
      ) {
        batch.delete(
          documentSnapshot.ref
        );
      }
    }
  );

  selectedPairings.forEach(
    (pairing) => {
      const pairingId =
        `${lampId}_${pairing.shadeId}`;

      const pairingReference =
        doc(
          db,
          "lampShadePairings",
          pairingId
        );

      const pairingData = {
        lampId,
        shadeId:
          pairing.shadeId,
        lampTitle,
        shadeTitle:
          pairing.shadeTitle,
        lightsOffImage:
          pairing.lightsOffImage,
        lightsOnImage:
          pairing.lightsOnImage,
        updatedAt:
          serverTimestamp()
      };

      if (
        !existingIds.has(
          pairingId
        )
      ) {
        pairingData.createdAt =
          serverTimestamp();
      }

      batch.set(
        pairingReference,
        pairingData,
        { merge: true }
      );
    }
  );

  await batch.commit();
}

function startLampEdit(lamp) {
  editingLampId = lamp.id;

  lampForm.title.value =
    lamp.title || "";

  lampForm.price.value =
    Number(lamp.price || 0);

  lampForm.stock.value =
    Number(lamp.stock || 0);

  lampForm.description.value =
    lamp.description || "";

  lampForm.featured.checked =
    Boolean(lamp.featured);

  lampForm.allowNoShade.checked =
    Boolean(lamp.allowNoShade);

  lampForm.existingImages.value =
    JSON.stringify(
      lamp.images || []
    );

  renderExistingLampImages(
    lamp.images || []
  );

  const savedPairings =
    pairingsByLampId.get(
      lamp.id
    ) || [];

  const legacyPairings =
    Array.isArray(
      lamp.recommendedShades
    )
      ? lamp.recommendedShades
      : [];

  renderAvailableShades(
    savedPairings.length > 0
      ? savedPairings
      : legacyPairings
  );

  lampFormTitle.textContent =
    "Edit Lamp";

  lampSubmitButton.textContent =
    "Update lamp";

  cancelLampEditButton.hidden =
    false;

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

async function deleteLamp(lamp) {
  const confirmed = confirm(
    `Delete "${lamp.title}"?`
  );

  if (!confirmed) {
    return;
  }

  try {
    const pairingsSnapshot =
      await getDocs(
        query(
          collection(
            db,
            "lampShadePairings"
          ),
          where(
            "lampId",
            "==",
            lamp.id
          )
        )
      );

    const batch =
      writeBatch(db);

    pairingsSnapshot.docs.forEach(
      (documentSnapshot) => {
        batch.delete(
          documentSnapshot.ref
        );
      }
    );

    batch.delete(
      doc(
        db,
        "products",
        lamp.id
      )
    );

    await batch.commit();
    await loadProducts();
  } catch (error) {
    console.error(
      "Lamp delete error:",
      error
    );

    alert(
      "The lamp could not be deleted."
    );
  }
}

cancelLampEditButton?.addEventListener(
  "click",
  resetLampForm
);

function resetLampForm() {
  editingLampId = null;

  lampForm.reset();

  lampForm.existingImages.value = "";

  lampForm.featured.checked = false;
  lampForm.allowNoShade.checked = true;

  document.getElementById(
    "existingLampImages"
  ).innerHTML = "";

  renderAvailableShades([]);

  lampFormTitle.textContent =
    "Add Lamp";

  lampSubmitButton.textContent =
    "Add lamp";

  cancelLampEditButton.hidden =
    true;
}

function renderExistingLampImages(images) {
  const container =
    document.getElementById(
      "existingLampImages"
    );

  container.innerHTML = "";

  images.forEach((imageUrl) => {
    const image =
      document.createElement("img");

    image.src = imageUrl;
    image.alt = "Existing lamp";
    image.className =
      "admin-existing-image";

    container.appendChild(image);
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
  lampSubmitButton.disabled =
    isSaving;

  if (isSaving) {
    lampSubmitButton.textContent =
      "Saving...";
    return;
  }

  lampSubmitButton.textContent =
    editingLampId
      ? "Update lamp"
      : "Add lamp";
}

function setStatus(message) {
  if (!lampStatus) {
    return;
  }

  lampStatus.textContent = message;
  lampStatus.hidden = !message;
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

function escapeAttribute(value) {
  return escapeHtml(value);
}

startLampsPage();