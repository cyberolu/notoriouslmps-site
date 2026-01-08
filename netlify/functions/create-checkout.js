const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: "Method Not Allowed" })
    };
  }

  try {
    const { items } = JSON.parse(event.body);

    if (!items || !items.length) {
      throw new Error("No items provided");
    }

    const lineItems = items.map(item => ({
      price_data: {
        currency: "gbp",
        product_data: {
          name: item.title,
          images: [item.image],
          metadata: {
            productId: item.id   // 👈 CRITICAL for stock locking
          }
        },
        unit_amount: Math.round(item.price * 100)
      },
      quantity: item.qty
    }));

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,

      // ✅ Use Netlify-provided base URL (works local + live)
      success_url: `${process.env.URL}/checkout/success`,
      cancel_url: `${process.env.URL}/cart`
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url: session.url })
    };

  } catch (err) {
    console.error("Stripe error:", err);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ error: err.message })
    };
  }
};
