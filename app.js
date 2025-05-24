const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- CORS Configuration ---
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- MIDTRANS API INSTANCE ---
// **CHANGED**: We are now using the Snap API, not the Core API
const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});


// --- PAYMENT ROUTE ---
app.post("/api/payment", async (req, res) => {
  try {
    // **CHANGED**: The parameter object is slightly different for Snap
    const parameter = {
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: req.body.amount,
      },
      customer_details: {
        first_name: req.body.firstName,
        last_name: req.body.lastName,
        email: req.body.email,
      },
      // You can add enabled_payments here if you want to limit options
      // enabled_payments: ["bank_transfer", "gopay"]
    };

    // **CHANGED**: We use snap.createTransaction() to get a token
    const transaction = await snap.createTransaction(parameter);

    // The response from createTransaction is { token: "...", redirect_url: "..." }
    const transactionToken = transaction.token;

    console.log('Midtrans Transaction Token:', transactionToken);

    // **CHANGED**: We send back ONLY the token inside a JSON object
    res.status(200).json({ token: transactionToken });

  } catch (error) {
    console.error('Midtrans API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});


// --- NOTIFICATION ROUTE (No changes needed here) ---
app.post("/api/notification", async (req, res) => {
  try {
    // You'll need a Core API instance just for notifications
    const core = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    const statusResponse = await core.transaction.notification(req.body);
    // ... your notification logic
    res.status(200).json({ status: "OK" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
