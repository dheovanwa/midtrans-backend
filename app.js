const express = require("express");
const midtransClient = require("midtrans-client");
const cors = require("cors");
require("dotenv").config();

const app = express();

// --- START ROBUST CORS CONFIGURATION ---

// 1. Define your allowed origins. 
// When you deploy your frontend, add its URL here. e.g., ['http://localhost:5173', 'https://your-frontend.onrender.com']
const allowedOrigins = ['http://localhost:5173'];

// 2. Configure CORS options
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true, // This is essential
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', // Allow all common methods
  allowedHeaders: 'Origin, X-Requested-With, Content-Type, Accept, Authorization', // Allow common headers
};

// 3. Use CORS middleware FIRST. This is crucial.
app.use(cors(corsOptions));

// 4. Explicitly handle preflight requests for all routes
// This ensures OPTIONS requests are handled correctly before they reach your routes.
app.options('*', cors(corsOptions)); 

// --- END ROBUST CORS CONFIGURATION ---


// Now, use your other middleware
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
