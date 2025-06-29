import express from "express";
import { connectDB, connectRedis } from "./utils/features.js";
import { errorMiddleware } from "./middlewares/error.js";
import { config } from "dotenv";
import morgan from "morgan";
import Stripe from "stripe";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";



// Importing Routes
import userRoute from "./routes/user.js";
import productRoute from "./routes/products.js";
import orderRoute from "./routes/order.js";
import paymentRoute from "./routes/payment.js";
import dashboardRoute from "./routes/stats.js";
import Redis from 'ioredis';


config({
  path: "./.env",
});

const port = process.env.PORT || 5000;
const mongoURI = process.env.MONGO_URI || "";
const stripeKey = process.env.STRIPE_KEY || "";
// const redisURI = process.env.REDIS_URI || "";
const clientURL = process.env.CLIENT_URL || "";
export const redisTTL = process.env.REDIS_TTL || 60 * 60 * 4;

connectDB(mongoURI);
// export const redis = connectRedis(redisURI);
export const redis = new Redis(process.env.REDIS_URI!, {
  connectTimeout: 10000, // 10 seconds
  tls: {}, // Important for rediss://
});
redis.on("error", (err) => {
  console.error("Redis error", err);
});
console.log(process.env.RAZORPAY_KEY_ID, process.env.RAZORPAY_SECRET);

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET,
});

export const stripe = new Stripe(stripeKey);

const app = express();


app.use(express.json());
app.use(morgan("dev"));

// cors

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);



app.get("/", (req, res) => {
  res.send("API Working with /api/v1");
});

// Using Routes
app.use("/api/v1/user", userRoute);
app.use("/api/v1/product", productRoute);
app.use("/api/v1/order", orderRoute);
app.use("/api/v1/payment", paymentRoute);
app.use("/api/v1/dashboard", dashboardRoute);

app.use("/uploads", express.static("uploads"));
app.use(errorMiddleware);


//check the backend is live or not 
app.get("/health", (req, res) => {
  res.status(200).send("Server is alive");
});

app.listen(port, () => {
  console.log(`Express is working on http://localhost:${port}`);
});
