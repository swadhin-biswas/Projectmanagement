import jwt from "jsonwebtoken";
import { UnauthorizedError } from "./errors.js";

export const generateToken = (userId) => {
  if (!userId) {
    throw new UnauthorizedError("User ID is required for token generation");
  }

  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || "your_jwt_secret",
    { expiresIn: "7d" }
  );
};

export const verifyToken = async (token) => {
  try {
    if (!token) {
      throw new UnauthorizedError("No token provided");
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "your_jwt_secret");

    // Verify userId exists in token payload
    if (!decoded.userId) {
      throw new UnauthorizedError("Invalid token payload");
    }

    return decoded;
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      throw new UnauthorizedError("Invalid token");
    }
    if (error.name === "TokenExpiredError") {
      throw new UnauthorizedError("Token expired");
    }
    throw error;
  }
};
