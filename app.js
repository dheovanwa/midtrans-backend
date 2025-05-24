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

app.post("/api/invoice/create", async (req, res) => {
    try {
        const { orderId, amount, customerFirstName, customerEmail } = req.body;

        if (!orderId || !amount || !customerFirstName || !customerEmail) {
            return res.status(400).json({ error: "Required fields are missing." });
        }

        // Server Key Anda perlu di-encode ke Base64, dan jangan lupa tambahkan ':' di akhir
        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const base64ServerKey = Buffer.from(serverKey + ':').toString('base64');
        
        const invoiceParams = {
            transaction_details: {
                order_id: orderId,
                gross_amount: amount
            },
            customer_details: {
                first_name: customerFirstName,
                email: customerEmail
            },
            item_details: [{
                id: `item-${orderId}`,
                price: amount,
                quantity: 1,
                name: 'Layanan Konsultasi'
            }],
            expiry: {
                unit: "day",
                duration: 7 // Invoice berlaku selama 7 hari
            }
        };

        const response = await fetch('https://api.sandbox.midtrans.com/v2/invoices', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${base64ServerKey}`
            },
            body: JSON.stringify(invoiceParams)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Midtrans Error: ${data.error_messages ? data.error_messages.join(', ') : 'Unknown error'}`);
        }

        // Kirim kembali invoice_url dan invoice_id ke frontend
        res.status(200).json({ invoice_url: data.invoice_url, id: data.id });

    } catch (error) {
        console.error("Failed to create Midtrans invoice:", error);
        res.status(500).json({ error: error.message });
    }
});

app.get("/api/invoice/status/:invoice_id", async (req, res) => {
    try {
        const { invoice_id } = req.params;

        const serverKey = process.env.MIDTRANS_SERVER_KEY;
        const base64ServerKey = Buffer.from(serverKey + ':').toString('base64');

        const response = await fetch(`https://api.sandbox.midtrans.com/v2/invoices/${invoice_id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Basic ${base64ServerKey}`
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(`Midtrans Error: ${data.error_messages ? data.error_messages.join(', ') : 'Not Found'}`);
        }
        
        // Kirim kembali seluruh data status invoice ke frontend
        res.status(200).json(data);

    } catch (error) {
        console.error("Failed to get Midtrans invoice status:", error);
        res.status(500).json({ error: error.message });
    }
});
