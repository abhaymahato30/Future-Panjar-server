import Razorpay from "razorpay";
import crypto from "crypto";
import { Request, Response, NextFunction } from "express";

import { TryCatch } from "../middlewares/error.js";
import ErrorHandler from "../utils/utility-class.js";
import { Coupon } from "../models/coupon.js";
import { Product } from "../models/product.js";
import { User } from "../models/user.js";
import { OrderItemType, ShippingInfoType } from "../types/types.js";

// ✅ Razorpay instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_SECRET!,
});

// ✅ Create Razorpay Order
export const createPaymentIntent = TryCatch(
  async (
    req: Request<
      any,
      any,
      {
        userId: string;
        items: OrderItemType[];
        shippingInfo: ShippingInfoType;
        coupon?: string;
      }
    >,
    res: Response,
    next: NextFunction
  ) => {
    const { userId, items, shippingInfo, coupon } = req.body;

    if (!userId || !items || !shippingInfo) {
      return next(new ErrorHandler("Missing required fields", 400));
    }

    const user = await User.findById(userId).select("name");
    if (!user) return next(new ErrorHandler("Please login first", 401));

    let discountAmount = 0;
    if (coupon) {
      const discount = await Coupon.findOne({ code: coupon });
      if (!discount)
        return next(new ErrorHandler("Invalid Coupon Code", 400));
      discountAmount = discount.amount;
    }

    const productIDs = items.map((item: OrderItemType) => item.productId);
    const products = await Product.find({ _id: { $in: productIDs } });

    const subtotal = products.reduce((prev: number, curr: any) => {
      const item = items.find((i: OrderItemType) => i.productId === curr._id.toString());
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
      receipt: `receipt_order_${Math.random().toString(36).substring(7)}`,
      notes: {
        customer_name: user.name,
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
        user: user.name,
      });
    } catch (err: any) {
      return next(new ErrorHandler("Razorpay order creation failed", 500));
    }
  }
);

// ✅ Verify Razorpay Payment
export const verifyPayment = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_SECRET!)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature === razorpay_signature) {
      res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      return next(new ErrorHandler("Payment verification failed", 400));
    }
  }
);

// ✅ Coupon: Create
export const newCoupon = TryCatch(async (req, res, next) => {
  const { code, amount } = req.body;

  if (!code || !amount)
    return next(new ErrorHandler("Please enter both coupon and amount", 400));

  await Coupon.create({ code, amount });

  res.status(201).json({
    success: true,
    message: `Coupon ${code} Created Successfully`,
  });
});

// ✅ Coupon: Apply
export const applyDiscount = TryCatch(async (req, res, next) => {
  const { coupon } = req.query;

  const discount = await Coupon.findOne({ code: coupon });

  if (!discount) return next(new ErrorHandler("Invalid Coupon Code", 400));

  res.status(200).json({
    success: true,
    discount: discount.amount,
  });
});

// ✅ Coupon: Get All
export const allCoupons = TryCatch(async (req, res, next) => {
  const coupons = await Coupon.find({});
  res.status(200).json({ success: true, coupons });
});

// ✅ Coupon: Get Single
export const getCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const coupon = await Coupon.findById(id);
  if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

  res.status(200).json({ success: true, coupon });
});

// ✅ Coupon: Update
export const updateCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;
  const { code, amount } = req.body;

  const coupon = await Coupon.findById(id);
  if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

  if (code) coupon.code = code;
  if (amount) coupon.amount = amount;
  await coupon.save();

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} Updated Successfully`,
  });
});

// ✅ Coupon: Delete
export const deleteCoupon = TryCatch(async (req, res, next) => {
  const { id } = req.params;

  const coupon = await Coupon.findByIdAndDelete(id);
  if (!coupon) return next(new ErrorHandler("Invalid Coupon ID", 400));

  res.status(200).json({
    success: true,
    message: `Coupon ${coupon.code} Deleted Successfully`,
  });
});
