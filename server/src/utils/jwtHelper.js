import { SignJWT, jwtVerify } from "jose";
import logger from "./logger.js";

/**
 * JWT helper functions for signing and verifying tokens
 * Uses jose library directly instead of @elysiajs/jwt
 */
class JwtHelper {
  constructor() {
    this.secret =
      process.env.JWT_SECRET || "fallback-secret-do-not-use-in-production";
    this.expiration = "7d";

    // Convert secret to Uint8Array for jose
    this.secretKey = new TextEncoder().encode(this.secret);

    // Token blacklist for revoked tokens (simple in-memory implementation)
    // In production, this should be a Redis store or similar
    this.revokedTokens = new Set();

    logger.info("JWT helper initialized");
  }

  /**
   * Sign a JWT token with the given payload
   *
   * @param {Object} payload - The payload to include in the token
   * @returns {Promise<string>} - The signed JWT token
   */
  async sign(payload) {
    try {
      if (!payload) {
        throw new Error("Payload is required for JWT token");
      }

      // Calculate expiration in seconds (7 days)
      const expiration = Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60;

      // Add additional security claims
      const enhancedPayload = {
        ...payload,
        jti: this.generateTokenId(), // Unique token ID for potential blacklisting
        iat: Math.floor(Date.now() / 1000), // Issued at timestamp
      };

      // Create and sign the JWT
      const jwt = await new SignJWT(enhancedPayload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime(expiration)
        .setIssuer("research-management-api")
        .setAudience("research-management-client")
        .setJti(enhancedPayload.jti) // Add jti to header claims too
        .sign(this.secretKey);

      return jwt;
    } catch (error) {
      logger.error("Error signing JWT token:", error);
      throw new Error("Failed to generate authentication token");
    }
  }

  /**
   * Verify a JWT token and return the payload
   *
   * @param {string} token - The JWT token to verify
   * @returns {Promise<Object|null>} - The payload if valid, null if invalid
   */
  async verify(token) {
    try {
      if (!token) {
        return null;
      }

      // Check if token is blacklisted
      if (this.isTokenRevoked(token)) {
        logger.warn("Attempt to use revoked token");
        return null;
      }

      const { payload } = await jwtVerify(token, this.secretKey, {
        issuer: "research-management-api",
        audience: "research-management-client",
      });

      // Validate token
      if (!this.validateTokenClaims(payload)) {
        logger.warn("Token validation failed: missing required claims");
        return null;
      }

      return payload;
    } catch (error) {
      logger.error("Error verifying JWT token:", error);
      return null;
    }
  }

  /**
   * Generate a unique token ID
   * @returns {string} - A unique token ID
   */
  generateTokenId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }

  /**
   * Validate the required claims in a token
   * @param {Object} payload - The token payload
   * @returns {boolean} - True if valid, false otherwise
   */
  validateTokenClaims(payload) {
    // Require at minimum: id, role, exp, iss
    return !!(payload.id && payload.role && payload.exp && payload.iss);
  }

  /**
   * Check if a token has been revoked
   * @param {string} token - The token to check
   * @returns {boolean} - True if revoked, false otherwise
   */
  isTokenRevoked(token) {
    return this.revokedTokens.has(token);
  }

  /**
   * Revoke a token (add to blacklist)
   * @param {string} token - The token to revoke
   */
  revokeToken(token) {
    this.revokedTokens.add(token);
    logger.info("Token revoked successfully");

    // Cleanup old tokens periodically (simple implementation)
    // In production, use a more robust solution
    if (this.revokedTokens.size > 1000) {
      this.cleanupRevokedTokens();
    }
  }

  /**
   * Clean up old revoked tokens (simple implementation)
   * In production, this should use token expiration times
   */
  cleanupRevokedTokens() {
    // This is a very simple cleanup - in production use a more robust solution
    // that checks token expiration
    logger.info("Cleaning up revoked tokens list");
    this.revokedTokens.clear();
  }
}

// Export a singleton instance
export default new JwtHelper();
