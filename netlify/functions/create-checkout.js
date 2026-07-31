const Stripe = require("stripe");
const admin = require("firebase-admin");

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY
);

const SHIPPING_COST_PENCE = 595;

function initialiseFirebase() {
  if (admin.apps.length) {
    return;
  }

  const privateKey =
    process.env.FIREBASE_PRIVATE_KEY;

  if (!privateKey) {
    throw new Error(
      "FIREBASE_PRIVATE_KEY is missing"
    );
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId:
        process.env.FIREBASE_PROJECT_ID,

      clientEmail:
        process.env.FIREBASE_CLIENT_EMAIL,

      privateKey:
        privateKey.replace(
          /\\n/g,
          "\n"
        )
    })
  });
}

function response(
  statusCode,
  body
) {
  return {
    statusCode,

    headers: {
      "Content-Type":
        "application/json"
    },

    body: JSON.stringify(body)
  };
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, {
      error: "Method not allowed"
    });
  }

  try {
    initialiseFirebase();

    const db =
      admin.firestore();

    const requestBody =
      JSON.parse(
        event.body || "{}"
      );

    const items =
      requestBody.items;

    if (
      !Array.isArray(items) ||
      items.length === 0
    ) {
      return response(400, {
        error:
          "Your basket is empty"
      });
    }

    const validatedItems = [];
    const lineItems = [];

    for (const cartItem of items) {
      const productType =
        cartItem.productType === "shade"
          ? "shade"
          : "lamp";

      const productId =
        productType === "shade"
          ? (
              cartItem.shadeId ||
              cartItem.productId ||
              cartItem.id
            )
          : (
              cartItem.lampId ||
              cartItem.productId ||
              cartItem.id
            );

      const quantity =
        Math.max(
          1,
          Math.floor(
            Number(
              cartItem.qty || 1
            )
          )
        );

      if (!productId) {
        throw new Error(
          "A basket item is missing its product ID"
        );
      }

      const productReference =
        db
          .collection("products")
          .doc(productId);

      const productSnapshot =
        await productReference.get();

      if (!productSnapshot.exists) {
        throw new Error(
          "A product in your basket no longer exists"
        );
      }

      const product =
        productSnapshot.data();

      const productStock =
        Number(
          product.stock || 0
        );

      if (
        productStock < quantity
      ) {
        throw new Error(
          `${product.title || "This product"} only has ${productStock} available`
        );
      }

      if (
        productType === "shade"
      ) {
        const unitPrice =
          Number(
            product.price || 0
          );

        if (
          !Number.isFinite(
            unitPrice
          ) ||
          unitPrice < 0
        ) {
          throw new Error(
            `Invalid price for ${product.title || "shade"}`
          );
        }

        if (
          product.available === false
        ) {
          throw new Error(
            `${product.title || "This shade"} is unavailable`
          );
        }

        const imageUrl =
          product.images?.[0] ||
          "";

        validatedItems.push({
          productType: "shade",
          productId,
          lampId: null,
          shadeId: productId,
          title:
            product.title ||
            "Lamp Shade",
          shadeName:
            product.title ||
            "Lamp Shade",
          quantity,
          unitPrice,
          lampPrice: 0,
          shadePrice: unitPrice,
          imageUrl
        });

        lineItems.push({
          price_data: {
            currency: "gbp",

            product_data: {
              name:
                product.title ||
                "Lamp Shade",

              description:
                "Standalone lamp shade",

              images:
                imageUrl
                  ? [imageUrl]
                  : [],

              metadata: {
                productType:
                  "shade",

                productId,

                lampId: "",

                shadeId:
                  productId
              }
            },

            unit_amount:
              Math.round(
                unitPrice * 100
              )
          },

          quantity
        });

        continue;
      }

      const lampPrice =
        Number(
          product.price || 0
        );

      if (
        !Number.isFinite(
          lampPrice
        ) ||
        lampPrice < 0
      ) {
        throw new Error(
          `Invalid price for ${product.title || "lamp"}`
        );
      }

      const selectedShadeId =
        cartItem.shadeId || null;

      let shadeName =
        "No Shade";

      let shadePrice = 0;

      let imageUrl =
        product.images?.[0] ||
        "";

      if (selectedShadeId) {
        const pairingId =
          `${productId}_${selectedShadeId}`;

        const pairingSnapshot =
          await db
            .collection(
              "lampShadePairings"
            )
            .doc(pairingId)
            .get();

        if (
          !pairingSnapshot.exists
        ) {
          throw new Error(
            "The selected shade is not available for this lamp"
          );
        }

        const pairing =
          pairingSnapshot.data();

        if (
          pairing.lampId !==
            productId ||
          pairing.shadeId !==
            selectedShadeId
        ) {
          throw new Error(
            "The selected lamp and shade combination is invalid"
          );
        }

        const shadeSnapshot =
          await db
            .collection("products")
            .doc(selectedShadeId)
            .get();

        if (
          !shadeSnapshot.exists
        ) {
          throw new Error(
            "The selected shade no longer exists"
          );
        }

        const shade =
          shadeSnapshot.data();

        if (
          shade.productType !==
          "shade"
        ) {
          throw new Error(
            "The selected product is not a shade"
          );
        }

        if (
          shade.available === false
        ) {
          throw new Error(
            `${shade.title || "The selected shade"} is unavailable`
          );
        }

        const shadeStock =
          Number(
            shade.stock || 0
          );

        if (
          shadeStock < quantity
        ) {
          throw new Error(
            `${shade.title || "The selected shade"} only has ${shadeStock} available`
          );
        }

        shadeName =
          shade.title ||
          pairing.shadeTitle ||
          "Lamp Shade";

        shadePrice =
          Number(
            shade.lampExtraPrice ??
            shade.price ??
            0
          );

        if (
          !Number.isFinite(
            shadePrice
          ) ||
          shadePrice < 0
        ) {
          throw new Error(
            `Invalid price for ${shadeName}`
          );
        }

        imageUrl =
          pairing.lightsOffImage ||
          pairing.lightsOnImage ||
          shade.images?.[0] ||
          product.images?.[0] ||
          "";
      } else if (
        product.allowNoShade !==
        true
      ) {
        throw new Error(
          `${product.title || "This lamp"} must be purchased with a shade`
        );
      }

      const unitPrice =
        lampPrice +
        shadePrice;

      validatedItems.push({
        productType: "lamp",
        productId,
        lampId: productId,
        shadeId:
          selectedShadeId,
        title:
          product.title ||
          "LMPs Lamp",
        shadeName,
        quantity,
        unitPrice,
        lampPrice,
        shadePrice,
        imageUrl
      });

      lineItems.push({
        price_data: {
          currency: "gbp",

          product_data: {
            name:
              product.title ||
              "LMPs Lamp",

            description:
              selectedShadeId
                ? `Shade: ${shadeName}`
                : "Lamp without shade",

            images:
              imageUrl
                ? [imageUrl]
                : [],

            metadata: {
              productType:
                "lamp",

              productId,

              lampId:
                productId,

              shadeId:
                selectedShadeId ||
                "",

              shadeName
            }
          },

          unit_amount:
            Math.round(
              unitPrice * 100
            )
        },

        quantity
      });
    }

    const baseUrl =
      process.env.URL ||
      process.env.DEPLOY_PRIME_URL ||
      "http://localhost:8888";

    const session =
      await stripe
        .checkout
        .sessions
        .create({
          mode: "payment",

          payment_method_types: [
            "card"
          ],

          line_items:
            lineItems,

          shipping_address_collection: {
            allowed_countries: [
              "GB"
            ]
          },

          shipping_options: [
            {
              shipping_rate_data: {
                type:
                  "fixed_amount",

                fixed_amount: {
                  amount:
                    SHIPPING_COST_PENCE,

                  currency:
                    "gbp"
                },

                display_name:
                  "UK delivery"
              }
            }
          ],

          success_url:
            `${baseUrl}/checkout/success/?session_id={CHECKOUT_SESSION_ID}`,

          cancel_url:
            `${baseUrl}/cart/`,

          metadata: {
            source:
              "lmps-store"
          },

          payment_intent_data: {
            metadata: {
              source:
                "lmps-store"
            }
          }
        });

    return response(200, {
      url: session.url
    });
  } catch (error) {
    console.error(
      "Checkout function error:",
      error
    );

    return response(500, {
      error:
        error.message ||
        "Checkout could not be created"
    });
  }
};