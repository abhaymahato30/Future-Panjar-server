import Razorpay from "razorpay";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { Coupon } from "../models/coupon.js";
import { Product } from "../models/product.js";
import { OrderItemType, ShippingInfoType } from "../types/types.js";
import { Order } from "../models/order.js";
// ✅ Create Razorpay Order (No userId required)
const createPaymentIntent = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const {
      items,
      shippingInfo,
      coupon,
      customerName,
    }: {
      items: OrderItemType[];
      shippingInfo: ShippingInfoType;
      coupon?: string;
      customerName?: string;
    } = req.body;

    if (!items || items.length === 0)
      return next(new ErrorHandler("Please send items", 400));

    if (!shippingInfo)
      return next(new ErrorHandler("Please send shipping info", 400));

    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_SECRET!,
    });

    let discountAmount = 0;
    if (coupon) {
      const discount = await Coupon.findOne({ code: coupon });
      if (!discount)
        return next(new ErrorHandler("Invalid Coupon Code", 400));
      discountAmount = discount.amount;
    }

    const productIDs = items.map((item) => item.productId);
    const products = await Product.find({ _id: { $in: productIDs } });

    const subtotal = products.reduce((prev: number, curr) => {
      const item = items.find((i) => i.productId === curr._id.toString());
      if (!item) return prev;
      return curr.price * item.quantity + prev;
    }, 0);

    const tax = subtotal * 0.18;
    const shipping = subtotal > 1000 ? 0 : 200;
    const total = Math.floor(subtotal + tax + shipping - discountAmount);
    const amountInPaise = total * 100;

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_order_${Math.random().toString(36).substring(2, 10)}`,
      notes: {
        customer_name: customerName || "Guest",
        address: `${shippingInfo.address}, ${shippingInfo.city}`,
      },
    };

    try {
      const order = await razorpay.orders.create(options);

      res.status(201).json({
        success: true,
        razorpayOrderId: order.id,
        amount: order.amount,
        currency: order.currency,
      });
    } catch (err) {
      return next(new ErrorHandler("Razorpay order creation failed", 500));
    }
  }
);

// ✅ Verify Razorpay Payment
// ✅ Verify Razorpay Payment and Store Order
const verifyPayment = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        items,
        shippingInfo,
        firebaseUserId,
        total,
        discount,
      } = req.body;

      // Validate required fields
      if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature ||
        !items ||
        !shippingInfo ||
        !firebaseUserId
      ) {
        console.error("❌ Missing required fields in verification");
        return next(new ErrorHandler("Missing required fields for verification", 400));
      }

      // Check Razorpay Secret
      if (!process.env.RAZORPAY_SECRET) {
        console.error("❌ RAZORPAY_SECRET not set in environment variables.");
        return next(new ErrorHandler("Internal Server Error: Secret key missing", 500));
      }

      // Signature verification
      const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(`${razorpay_order_id}|${razorpay_payment_id}`)
        .digest("hex");

      console.log("✅ razorpay_order_id:", razorpay_order_id);
      console.log("✅ razorpay_payment_id:", razorpay_payment_id);
      console.log("✅ Received Signature:", razorpay_signature);
      console.log("✅ Generated Signature:", generatedSignature);

      if (generatedSignature !== razorpay_signature) {
        console.warn("❌ Signature mismatch");
        return next(new ErrorHandler("Payment verification failed", 400));
      }

      // Create order
      const order = await Order.create({
        orderItems: items,
        shippingInfo,
        user: firebaseUserId,
        total,
        discount,
        paymentMethod: "Online",
        paymentInfo: {
          razorpay_order_id,
          razorpay_payment_id,
          razorpay_signature,
          status: "Paid",
        },
        status: "Processing",
      });

      console.log("✅ Order created:", order._id);

      res.status(200).json({
        success: true,
        message: "Payment verified and order placed",
      });
    } catch (error) {
      console.error("🔥 Error in payment verification:", error);
      return next(new ErrorHandler("Internal Server Error", 500));
    }
  }
);




// ✅ Export
export { createPaymentIntent, verifyPayment };
