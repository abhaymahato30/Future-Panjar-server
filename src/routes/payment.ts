import express from "express";
import {
  allCoupons,
  applyDiscount,
  createPaymentIntent,
  deleteCoupon,
  getCoupon,
  newCoupon,
  updateCoupon,
  verifyPayment,
} from "../controllers/payment.js";
import { isAuthenticated, authorizeRoles } from "../middlewares/auth.js";

const app = express.Router();

// ✅ Authenticated users can create payment orders
app.post("/create", isAuthenticated, createPaymentIntent);

// ✅ Verify Razorpay payment
app.post("/verify", isAuthenticated, verifyPayment);

// ✅ Authenticated users can apply discount
app.get("/discount", isAuthenticated, applyDiscount);

// ✅ Admin-only routes for managing coupons
app.post("/coupon/new", isAuthenticated, authorizeRoles("admin"), newCoupon);
app.get("/coupon/all", isAuthenticated, authorizeRoles("admin"), allCoupons);

app
  .route("/coupon/:id")
  .get(isAuthenticated, authorizeRoles("admin"), getCoupon)
  .put(isAuthenticated, authorizeRoles("admin"), updateCoupon)
  .delete(isAuthenticated, authorizeRoles("admin"), deleteCoupon);

export default app;
