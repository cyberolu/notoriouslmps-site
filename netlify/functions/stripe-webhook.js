const Stripe = require("stripe");
const admin = require("firebase-admin");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405 };
  }

  const sig = event.headers["stripe-signature"];

  let stripeEvent;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`
    };
  }

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    const lineItems = await stripe.checkout.sessions.listLineItems(
      session.id,
      { expand: ["data.price.product"] }
    );

    const batch = db.batch();

    for (const item of lineItems.data) {
      const productId = item.price.product.metadata.productId;
      const qty = item.quantity;

      const ref = db.collection("products").doc(productId);
      const snap = await ref.get();

      if (snap.exists) {
        const currentStock = snap.data().stock || 0;
        batch.update(ref, {
          stock: Math.max(currentStock - qty, 0)
        });
      }
    }

    await batch.commit();
  }

  return { statusCode: 200 };
};
