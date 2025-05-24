const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
require("dotenv").config();

const app = express();

const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

const snap = new midtransClient.Snap({
  isProduction: false,
  serverKey: process.env.MIDTRANS_SERVER_KEY,
  clientKey: process.env.MIDTRANS_CLIENT_KEY,
});


// Di dalam file app.js

app.post("/api/payment", async (req, res) => {
  try {
    // Ambil orderId dari body request yang dikirim frontend
    const { orderId, amount, firstName, lastName, email } = req.body;

    // Validasi apakah orderId dan amount ada
    if (!orderId || !amount) {
      return res.status(400).json({ error: "orderId and amount are required." });
    }
    if (!firstName || !email) {
        return res.status(400).json({ error: "Customer details (firstName, email) are required." });
    }


    const parameter = {
      transaction_details: {
        // --- GUNAKAN orderId DARI FRONTEND ---
        order_id: orderId,
        gross_amount: amount,
      },
      customer_details: {
        first_name: firstName,
        last_name: lastName || "", // lastName bisa opsional
        email: email,
      },
      callbacks: {
        // Arahkan kembali ke halaman manage-appointment atau halaman sukses yang lebih spesifik
        finish: `http://localhost:5173/manage-appointment?payment_attempt_order_id=${orderId}`
      }
    };

    const transaction = await snap.createTransaction(parameter);
    const transactionToken = transaction.token;

    console.log(`Midtrans Transaction Token for order ${orderId}:`, transactionToken);

    res.status(200).json({ token: transactionToken });

  } catch (error) {
    console.error('Midtrans API Error:', error.message, error.ApiResponse ? error.ApiResponse.message : '');
    // Kirim pesan error yang lebih spesifik jika tersedia dari Midtrans
    const errorMessage = error.ApiResponse && error.ApiResponse.message
                         ? error.ApiResponse.message.join(', ')
                         : error.message;
    res.status(500).json({ error: errorMessage });
  }
});

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
