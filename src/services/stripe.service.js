const Stripe = require("stripe");

let stripeClient = null;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    const err = new Error("Stripe is not configured (missing STRIPE_SECRET_KEY)");
    err.status = 503;
    throw err;
  }
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

function siteOrigin(req) {
  const fromEnv = (process.env.PUBLIC_SITE_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  const origin = req.get("origin") || req.get("referer") || "";
  if (origin.includes("nanakmigration.com.au")) return "https://www.nanakmigration.com.au";
  if (origin.includes("localhost")) {
    try {
      return new URL(origin).origin;
    } catch {
      /* fall through */
    }
  }
  return "https://www.nanakmigration.com.au";
}

/**
 * Create a Stripe Checkout Session for a consultation fee (AUD).
 */
async function createConsultCheckoutSession({
  req,
  bookingId,
  amountCents,
  consultName,
  customerEmail,
  customerName,
}) {
  const stripe = getStripe();
  const origin = siteOrigin(req);
  const successUrl = `${origin}/book-consultation?booking=success&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${origin}/book-consultation?booking=cancelled&booking_id=${bookingId}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: customerEmail || undefined,
    client_reference_id: bookingId,
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: "aud",
          unit_amount: amountCents,
          product_data: {
            name: consultName || "Migration consultation",
            description: "Consultation fee — credited if you engage Nanak Migration Group (MARN 2619467).",
          },
        },
      },
    ],
    metadata: {
      bookingId,
      customerName: customerName || "",
    },
    success_url: successUrl,
    cancel_url: cancelUrl,
  });

  return session;
}

async function retrieveCheckoutSession(sessionId) {
  const stripe = getStripe();
  return stripe.checkout.sessions.retrieve(sessionId);
}

module.exports = {
  getStripe,
  siteOrigin,
  createConsultCheckoutSession,
  retrieveCheckoutSession,
};
