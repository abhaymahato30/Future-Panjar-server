import express from "express";
import {
  createPaymentIntent,
  verifyPayment,
} from "../controllers/payment.js";

const app = express.Router();

// ✅ Allow all users to create payment orders (no authentication required)
app.post("/create", createPaymentIntent);

// ✅ Verify Razorpay payment (still requires login to create actual order)
app.post("/verify", verifyPayment);

export default app;
