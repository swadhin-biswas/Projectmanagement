import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import { verifyToken } from "../utils/generateToken.js";

export const config = {
  jwtSecret: process.env.JWT_SECRET || "your_jwt_secret"
};

export { verifyToken };

export const protect = async (req, res, next) => {
  try {
    let token;

    // Check for token in Authorization header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Make sure token exists
      if (!token) {
        res.status(401);
        throw new Error("Not authorized, no token");
      }

      // Verify token
      const decoded = jwt.verify(token, config.jwtSecret);

      // Get userId from token payload
      const userId = decoded.userId;
      if (!userId) {
        res.status(401);
        throw new Error("Not authorized, invalid token payload");
      }

      // Get user from the token
      req.user = await User.findById(userId).select("-password");

      if (!req.user) {
        res.status(401);
        throw new Error("Not authorized, user not found");
      }

      // Check if supervisor account is approved
      if (req.user.role === "supervisor" && !req.user.isApproved) {
        res.status(401);
        throw new Error("Account pending approval");
      }

      next();
    } else {
      res.status(401);
      throw new Error("Not authorized, no token");
    }
  } catch (error) {
    console.error(error);
    res.status(401);
    next(error); // Pass the error to the error handler middleware
  }
};

export const admin = (req, res, next) => {
  try {
    if (req.user && req.user.role === "admin") {
      next();
    } else {
      res.status(403); // Using 403 Forbidden instead of 401 for role-based access
      throw new Error("Not authorized as an admin");
    }
  } catch (error) {
    next(error);
  }
};

export const supervisor = (req, res, next) => {
  try {
    if (
      req.user &&
      (req.user.role === "supervisor" || req.user.role === "admin")
    ) {
      next();
    } else {
      res.status(403); // Using 403 Forbidden for role-based access
      throw new Error("Not authorized as a supervisor");
    }
  } catch (error) {
    next(error);
  }
};

// Combined middleware for checking multiple roles
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (req.user && roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403);
      next(new Error(`Not authorized. Required roles: ${roles.join(", ")}`));
    }
  };
};

// Middleware to check if user is accessing their own resource or has admin privileges
export const ownerOrAdmin = (idParam = "userId") => {
  return (req, res, next) => {
    const resourceId = req.params[idParam];

    if (
      (req.user && req.user._id.toString() === resourceId) ||
      (req.user && req.user.role === "admin")
    ) {
      next();
    } else {
      res.status(403);
      next(new Error("Not authorized to access this resource"));
    }
  };
};
