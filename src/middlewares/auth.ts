import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { User } from "../models/user.js";
import ErrorHandler from "../utils/utility-class.js";
import { TryCatch } from "./error.js";

export const isAuthenticated = TryCatch(
  async (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return next(new ErrorHandler("Please login to continue", 401));

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string };

    const user = await User.findById(decoded._id);
    if (!user) return next(new ErrorHandler("User not found", 404));

    req.user = user;
    next();
  }
);

// Optional: role-based access
export const authorizeRoles = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new ErrorHandler("You are not authorized", 403));
    }
    next();
  };
};
export const adminOnly = TryCatch(async (req: Request, res: Response, next: NextFunction) => {
  const id = req.query.id;

  if (!id) return next(new ErrorHandler("Please login first", 401));

  const user = await User.findById(id);
  if (!user) return next(new ErrorHandler("Invalid user", 401));
  if (user.role !== "admin") return next(new ErrorHandler("Access denied", 403));

  next();
});