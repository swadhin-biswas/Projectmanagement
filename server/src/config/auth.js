import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

export const config = {
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret",
};

// List of routes that don't require authentication
const publicRoutes = [
  "/api/auth/register",
  "/api/auth/login",
  "/api/auth/reset-password-request",
  "/api/auth/reset-password",
  "/api/auth/verify-email",
  "/api-docs",
  "/swagger",
  "/api/health",
];

export const protect = async (req, res, next) => {
  try {
    // Check if route is public
    const isPublicRoute = publicRoutes.some((route) =>
      req.path.startsWith(route)
    );
    if (isPublicRoute) {
      return next();
    }

    let token;
    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401);
      throw new Error("Not authorized, no token");
    }

    const decoded = jwt.verify(token, config.jwtSecret);
    const userId = decoded.userId;

    if (!userId) {
      res.status(401);
      throw new Error("Not authorized, invalid token payload");
    }

    const user = await User.findById(userId).select("-password");
    if (!user) {
      res.status(401);
      throw new Error("Not authorized, user not found");
    }

    // Check supervisor approval
    if (user.role === "supervisor" && !user.isApproved) {
      res.status(401);
      throw new Error("Account pending approval");
    }

    req.user = user;
    next();
  } catch (error) {
    console.error(error);
    res.status(401);
    next(error);
  }
};

// Role-based authorization middleware
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Authentication required"));
    }

    if (!roles.includes(req.user.role)) {
      res.status(403);
      return next(
        new Error(`Access denied. Required roles: ${roles.join(", ")}`)
      );
    }

    next();
  };
};

// Resource owner or admin check middleware
export const ownerOrAdmin = (idParam = "userId") => {
  return (req, res, next) => {
    if (!req.user) {
      res.status(401);
      return next(new Error("Authentication required"));
    }

    const resourceId = req.params[idParam];
    if (
      req.user._id.toString() === resourceId ||
      req.user.role === "admin" ||
      req.user.role === "super_admin"
    ) {
      return next();
    }

    res.status(403);
    next(new Error("Not authorized to access this resource"));
  };
};

// Admin only middleware
export const adminOnly = (req, res, next) => {
  if (!req.user) {
    res.status(401);
    return next(new Error("Authentication required"));
  }

  if (req.user.role !== "admin" && req.user.role !== "super_admin") {
    res.status(403);
    return next(new Error("Admin access required"));
  }

  next();
};
