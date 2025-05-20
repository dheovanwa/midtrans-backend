const express = require("express");
const midtransClient = require("midtrans-client");
require("dotenv").config();

const app = express();
app.use(express.json());

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
    const orderId = statusResponse.order_id;
    const transactionStatus = statusResponse.transaction_status;
    const fraudStatus = statusResponse.fraud_status;

    if (transactionStatus == "capture") {
      if (fraudStatus == "challenge") {
        // TODO: handle challenge transaction
      } else if (fraudStatus == "accept") {
        // TODO: handle successful transaction
      }
    } else if (transactionStatus == "settlement") {
      // TODO: handle successful transaction
    } else if (
      transactionStatus == "cancel" ||
      transactionStatus == "deny" ||
      transactionStatus == "expire"
    ) {
      // TODO: handle failed transaction
    }

    res.status(200).json({ status: "OK" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
