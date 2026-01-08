const Stripe = require("stripe");
const admin = require("firebase-admin");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Initialise Firebase Admin once
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

exports.handler = async (event) => {
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
      body: "Webhook Error"
    };
  }

  // Only act on successful checkout
  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;

    try {
      // IMPORTANT: expand product metadata
      const lineItems = await stripe.checkout.sessions.listLineItems(
        session.id,
        { expand: ["data.price.product"] }
      );

      const batch = db.batch();

      lineItems.data.forEach(item => {
        const productId = item.price.product.metadata.productId;
        const qty = item.quantity;

        if (!productId) return;

        const productRef = db.collection("products").doc(productId);

        // Atomic decrement
        batch.update(productRef, {
          stock: admin.firestore.FieldValue.increment(-qty)
        });
      });

      await batch.commit();

    } catch (err) {
      console.error("Stock update failed:", err);
      return {
        statusCode: 500,
        body: "Stock update failed"
      };
    }
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true })
  };
};
