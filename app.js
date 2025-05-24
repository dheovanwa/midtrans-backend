const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- START: SIMPLIFIED & CORRECTED CORS CONFIGURATION ---

const corsOptions = {
  // Add your deployed frontend URL here when you have one.
  // For now, this is correct for local development.
  origin: 'http://localhost:5173', 
  credentials: true, // Allows cookies and credentials to be sent
  optionsSuccessStatus: 200 // For legacy browser support
};

// Use the CORS middleware AT THE TOP.
app.use(cors(corsOptions));

// --- END: CORS CONFIGURATION ---


// Use your other middleware AFTER CORS
app.use(express.json());


// --- Your existing code remains the same ---

// Create Midtrans Core API instance
const core = new midtransClient.CoreApi({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});

// Create payment endpoint
app.post("/api/payment", async (req, res) => {
  try {
    const parameter = {
      payment_type: "bank_transfer",
      transaction_details: {
        order_id: `ORDER-${Date.now()}`,
        gross_amount: req.body.amount,
      },
      customer_details: {
        email: req.body.email,
        first_name: req.body.firstName,
        last_name: req.body.lastName,
      },
    };

    const transaction = await core.charge(parameter);
    res.json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Handle notification endpoint
app.post("/api/notification", async (req, res) => {
  try {
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
