const pool = require("../config/db");
const Stripe = require("stripe");
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.createStripePayment = async (req, res) => {
  try {
    const { amount, currency, user_id, cart, payment_method_id } = req.body;

    if (!amount || !user_id || !payment_method_id) {
      return res.status(400).json({ success: false, error: "Missing required parameters." });
    }

    // Create PaymentIntent with return_url for redirects
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: currency || "usd",
      payment_method: payment_method_id,
      
      confirm: true,
       automatic_payment_methods: {
    enabled:         true,
    allow_redirects: "never",    // disables any redirect-based flows
  },  // <-- Add this
      metadata: { user_id, cart: JSON.stringify(cart) },
    });

    // Store payment record
    const [result] = await pool.execute(
      `INSERT INTO payments 
        (user_id, amount, currency, stripe_payment_id, status, metadata)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [user_id, amount, currency, paymentIntent.id, paymentIntent.status, JSON.stringify({ cart })]
    );
    const payment_id = result.insertId;

    // Store purchased jobs
    if (Array.isArray(cart)) {
      for (const item of cart) {
        await pool.execute(
          `INSERT IGNORE INTO user_jobs (user_id, job_id, payment_id)
           VALUES (?, ?, ?)`,
          [user_id, item.job_id, payment_id]
        );
      }
    }

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      status: paymentIntent.status,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
};
