import { jwtAuth } from "./auth.js";

/**
 * This is a compatibility file to maintain backward compatibility
 * For new code, please import directly from auth.js
 */

export const isAuthenticated = jwtAuth;
