import { SignJWT, jwtVerify } from "jose";
import logger from "./logger.js";

// Environment variables
const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret";
const JWT_EXPIRY = process.env.JWT_EXPIRY || "7d";

/**
 * Generate a JWT token with proper payload structure
 * @param {Object} payload The payload to include in the token
 * @returns {Promise<string>} The generated JWT token
 */
export const generateToken = async (payload) => {
  try {
    // Create a clean payload without any unwanted properties
    const cleanPayload = {
      userId: payload.userId,
      role: payload.role,
      email: payload.email,
      // Add any other required fields here
    };

    // Calculate expiry date (7 days by default)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7); // 7 days from now

    // Add expiry to payload
    cleanPayload.exp = Math.floor(expiry.getTime() / 1000);

    // Log the payload for debugging
    logger.debug("Clean JWT payload being signed:", cleanPayload);

    // Convert the secret to a UInt8Array for jose
    const secretKey = new TextEncoder().encode(JWT_SECRET);

    // Sign the token
    const token = await new SignJWT(cleanPayload)
      .setProtectedHeader({ alg: "HS256" })
      .sign(secretKey);

    return token;
  } catch (error) {
    logger.error("Error generating JWT token:", error);
    throw new Error("Failed to generate authentication token");
  }
};

/**
 * Verify a JWT token
 * @param {string} token The token to verify
 * @returns {Promise<Object>} The decoded token payload
 */
export const verifyToken = async (token) => {
  try {
    const secretKey = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secretKey);

    return payload;
  } catch (error) {
    logger.error("Error verifying JWT token:", error);
    throw new Error("Invalid authentication token");
  }
};

export default {
  generateToken,
  verifyToken,
};
