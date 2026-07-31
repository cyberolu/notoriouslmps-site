const Stripe = require("stripe");
const admin = require("firebase-admin");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function initialiseFirebase() {
  if (admin.apps.length) {
    return;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error("FIREBASE_PRIVATE_KEY is missing");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, "\n")
    })
  });
}

function response(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

function getStripeSignature(headers = {}) {
  return (
    headers["stripe-signature"] ||
    headers["Stripe-Signature"] ||
    headers["STRIPE-SIGNATURE"]
  );
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, {
      error: "Method not allowed"
    });
  }

  try {
    initialiseFirebase();

    const db = admin.firestore();

    const signature = getStripeSignature(
      event.headers
    );

    if (!signature) {
      return response(400, {
        error: "Missing Stripe signature"
      });
    }

    const stripeEvent =
      stripe.webhooks.constructEvent(
        event.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );

    if (
      stripeEvent.type !==
      "checkout.session.completed"
    ) {
      return response(200, {
        received: true,
        ignored: true
      });
    }

    const session = stripeEvent.data.object;

    if (session.payment_status !== "paid") {
      return response(200, {
        received: true,
        paymentStatus: session.payment_status
      });
    }

    const stripeLineItems =
      await stripe.checkout.sessions.listLineItems(
        session.id,
        {
          limit: 100,
          expand: [
            "data.price.product"
          ]
        }
      );

    const orderItems =
      stripeLineItems.data.map(
        (lineItem) => {
          const stripeProduct =
            lineItem.price?.product;

          const metadata =
            stripeProduct &&
            typeof stripeProduct === "object"
              ? stripeProduct.metadata || {}
              : {};

          const quantity = Math.max(
            1,
            Math.floor(
              Number(lineItem.quantity || 1)
            )
          );

          const unitPrice =
            Number(
              lineItem.price?.unit_amount || 0
            ) / 100;

          const productType =
            metadata.productType === "shade"
              ? "shade"
              : "lamp";

          const lampId =
            metadata.lampId || null;

          const shadeId =
            metadata.shadeId || null;

          const productId =
            metadata.productId ||
            lampId ||
            shadeId ||
            "";

          return {
            productType,
            productId,
            lampId,
            shadeId,

            title:
              stripeProduct &&
              typeof stripeProduct === "object"
                ? stripeProduct.name ||
                  lineItem.description ||
                  "LMPs Product"
                : lineItem.description ||
                  "LMPs Product",

            shadeName:
              metadata.shadeName ||
              (
                productType === "shade"
                  ? lineItem.description ||
                    "Lamp Shade"
                  : "No Shade"
              ),

            imageUrl:
              stripeProduct &&
              typeof stripeProduct === "object"
                ? stripeProduct.images?.[0] || ""
                : "",

            quantity,
            unitPrice,

            lampPrice:
              productType === "lamp"
                ? unitPrice
                : 0,

            shadePrice:
              productType === "shade"
                ? unitPrice
                : 0
          };
        }
      );

if (orderItems.length === 0) {
  throw new Error(
    "No purchased items were returned by Stripe"
  );
}

    const orderRef = db
      .collection("orders")
      .doc(session.id);

    const orderCounterRef = db
      .collection("storeCounters")
      .doc("orders");

    await db.runTransaction(async (transaction) => {
      const [
        existingOrderSnapshot,
        orderCounterSnapshot
      ] = await Promise.all([
        transaction.get(orderRef),
        transaction.get(orderCounterRef)
      ]);

      if (existingOrderSnapshot.exists) {
        return;
      }

      const currentOrderNumber =
        orderCounterSnapshot.exists
          ? Number(
              orderCounterSnapshot.data().lastNumber || 0
            )
          : 0;

      const nextOrderNumber =
        currentOrderNumber + 1;

      const customerOrderNumber =
        `LMP-${String(nextOrderNumber).padStart(6, "0")}`;

      const requiredDocuments = new Map();

      for (const item of orderItems) {
        const quantity = Math.max(
          1,
          Math.floor(
            Number(item.quantity || item.qty || 1)
          )
        );

        if (item.productType === "shade") {
          const shadeId =
            item.shadeId ||
            item.productId;

          if (!shadeId) {
            throw new Error(
              "Standalone shade ID is missing"
            );
          }

          const key = `products/${shadeId}`;

          if (!requiredDocuments.has(key)) {
            requiredDocuments.set(key, {
              ref: db.collection("products").doc(shadeId),
              quantity: 0,
              title: item.title || "Lamp Shade"
            });
          }

          requiredDocuments.get(key).quantity += quantity;

          continue;
        }

        const lampId =
          item.lampId ||
          item.productId;

        if (!lampId) {
          throw new Error("Lamp ID is missing");
        }

        const lampKey = `products/${lampId}`;

        if (!requiredDocuments.has(lampKey)) {
          requiredDocuments.set(lampKey, {
            ref: db.collection("products").doc(lampId),
            quantity: 0,
            title: item.title || "Lamp"
          });
        }

        requiredDocuments.get(lampKey).quantity += quantity;

        if (item.shadeId) {
          const shadeKey =
            `products/${item.shadeId}`;

          if (!requiredDocuments.has(shadeKey)) {
            requiredDocuments.set(shadeKey, {
              ref: db
                .collection("products")
                .doc(item.shadeId),
              quantity: 0,
              title:
                item.shadeName ||
                "Lamp Shade"
            });
          }

          requiredDocuments.get(shadeKey).quantity += quantity;
        }
      }

      const documentEntries =
        Array.from(requiredDocuments.values());

      const documentSnapshots =
        await Promise.all(
          documentEntries.map((entry) =>
            transaction.get(entry.ref)
          )
        );

      documentSnapshots.forEach(
        (snapshot, index) => {
          const entry = documentEntries[index];

          if (!snapshot.exists) {
            throw new Error(
              `${entry.title} no longer exists`
            );
          }

          const currentStock = Number(
            snapshot.data().stock || 0
          );

          if (currentStock < entry.quantity) {
            throw new Error(
              `${entry.title} has insufficient stock. Available: ${currentStock}`
            );
          }
        }
      );

      documentSnapshots.forEach(
        (snapshot, index) => {
          const entry = documentEntries[index];

          const currentStock = Number(
            snapshot.data().stock || 0
          );

          transaction.update(entry.ref, {
            stock: currentStock - entry.quantity,
            updatedAt:
              admin.firestore.FieldValue.serverTimestamp()
          });
        }
      );

      const normalisedItems = orderItems.map(
        (item) => {
          const quantity = Math.max(
            1,
            Math.floor(
              Number(item.quantity || item.qty || 1)
            )
          );

          const unitPrice = Number(
            item.unitPrice || 0
          );

          return {
            productType:
              item.productType || "lamp",

            productId:
              item.productId ||
              item.lampId ||
              item.shadeId ||
              "",

            lampId:
              item.lampId || null,

            shadeId:
              item.shadeId || null,

            title:
              item.title ||
              "Notorious Lamp",

            shadeName:
              item.shadeName ||
              "No Shade",

            imageUrl:
              item.imageUrl || "",

            lampPrice:
              Number(item.lampPrice || 0),

            shadePrice:
              Number(item.shadePrice || 0),

            unitPrice,
            qty: quantity,
            lineTotal: unitPrice * quantity
          };
        }
      );

      transaction.set(
        orderCounterRef,
        {
          lastNumber: nextOrderNumber,
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp()
        },
        {
          merge: true
        }
      );

      transaction.set(orderRef, {
        stripeSessionId: session.id,
        orderNumber: customerOrderNumber,
        
        stripePaymentIntent:
          session.payment_intent || "",

        customerEmail:
          session.customer_details?.email ||
          session.customer_email ||
          "",

        customerName:
          session.customer_details?.name ||
          "",

        amountTotal:
          Number(session.amount_total || 0),

        total:
          Number(session.amount_total || 0) / 100,

        currency:
          session.currency || "gbp",

        paymentStatus:
          session.payment_status || "paid",

        status: "processing",
        fulfilmentStatus: "processing",

        items: normalisedItems,

        createdAt:
          admin.firestore.FieldValue.serverTimestamp(),

        updatedAt:
          admin.firestore.FieldValue.serverTimestamp()
      });
    });

    console.log(
      "Order processed:",
      session.id
    );

    return response(200, {
      received: true,
      orderId: session.id
    });
  } catch (error) {
    console.error(
      "Stripe webhook function error:",
      error
    );

    return response(400, {
      error:
        error.message ||
        "Webhook processing failed"
    });
  }
};