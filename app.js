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

const puppeteer = require('puppeteer');
const midtransClient = require('midtrans-client');
// Anda mungkin perlu db dari firebase-config jika belum ada di file ini
// const { db } = require('./config/firebase'); // Sesuaikan path jika perlu

// --- Endpoint untuk Membuat dan Mengunduh PDF Struk ---
app.get("/api/invoice/:orderId", async (req, res) => {
  try {
    const { orderId } = req.params;

    // 1. Inisialisasi Midtrans Core API
    const core = new midtransClient.CoreApi({
      isProduction: false,
      serverKey: process.env.MIDTRANS_SERVER_KEY,
      clientKey: process.env.MIDTRANS_CLIENT_KEY,
    });

    // 2. Ambil detail transaksi dari Midtrans untuk data pembayaran
    const midtransStatus = await core.transaction.status(orderId);

    // 3. Ambil detail appointment dari database Firestore Anda
    // Ini PENTING untuk mendapatkan detail sesi yang akurat.
    // Pastikan Anda sudah menginisialisasi 'db' dari Firebase di file ini.
    // const appointmentRef = db.collection('appointments').doc(orderId);
    // const appointmentSnap = await appointmentRef.get();
    // if (!appointmentSnap.exists) {
    //   return res.status(404).json({ error: "Appointment data not found in database." });
    // }
    // const appointmentData = appointmentSnap.data();

    // -- Untuk sementara kita gunakan data dummy sambil menunggu koneksi DB Anda
    const appointmentData = {
        patientName: midtransStatus.customer_details.first_name + ' ' + (midtransStatus.customer_details.last_name || ''),
        doctorName: "Dr. Serenity", // Ganti dengan data asli dari DB
        method: "Chat", // Ganti dengan data asli dari DB
        dayName: "Sabtu",
        date: "2025-05-24",
        time: "10:00"
    };
    // -- Akhir data dummy

    // 4. Buat konten HTML yang akan dijadikan PDF
    const content = `
      <html>
        <head>
          <style>
            body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; }
            .container { max-width: 800px; margin: auto; padding: 30px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0, 0, 0, 0.15); }
            .header { text-align: center; border-bottom: 2px solid #187DA8; padding-bottom: 15px; margin-bottom: 30px; }
            .header h1 { margin: 0; color: #187DA8; }
            .details-grid { display: grid; grid-template-columns: 150px 1fr; gap: 5px 20px; }
            .details-grid strong { color: #555; }
            .items-table { width: 100%; margin-top: 40px; border-collapse: collapse; }
            .items-table th, .items-table td { border: 1px solid #eee; padding: 8px; text-align: left; }
            .items-table th { background-color: #f8f8f8; }
            .total { margin-top: 30px; text-align: right; }
            .total h2 { margin: 0; color: #187DA8; }
            .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #777; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Bukti Pembayaran</h1>
            </div>
            <div class="details-grid">
              <strong>Order ID:</strong>         <span>${midtransStatus.order_id}</span>
              <strong>Tanggal Bayar:</strong>    <span>${new Date(midtransStatus.settlement_time).toLocaleString('id-ID', { dateStyle: 'long', timeStyle: 'short' })} WIB</span>
              <strong>Metode Pembayaran:</strong> <span>${midtransStatus.payment_type.replace(/_/g, ' ').toUpperCase()}</span>
              <strong>Status:</strong>           <span style="color: green; font-weight: bold;">LUNAS</span>
            </div>
            <table class="items-table">
              <thead>
                <tr>
                  <th>Layanan</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Sesi Konsultasi</td>
                  <td>${appointmentData.method} dengan ${appointmentData.doctorName} untuk ${appointmentData.patientName}</td>
                </tr>
              </tbody>
            </table>
            <div class="total">
              <h2>Total: Rp${Number(midtransStatus.gross_amount).toLocaleString('id-ID')}</h2>
            </div>
            <div class="footer">
              <p>Terima kasih telah menggunakan layanan Serenity.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const browser = await puppeteer.launch({ 
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    await page.setContent(content, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
    await browser.close();

    // 6. Kirim PDF sebagai file download
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': pdfBuffer.length,
      'Content-Disposition': `attachment; filename="struk-${orderId}.pdf"`
    });
    res.send(pdfBuffer);

  } catch (error) {
    console.error("Failed to generate invoice:", error);
    res.status(500).json({ error: "Gagal membuat struk." });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
