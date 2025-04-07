/**
 * Helper functions
 */

/**
 * Generate a random ID with optional prefix
 * @param {string} prefix - Optional prefix for the ID
 * @param {number} length - Length of the random part of the ID
 * @returns {string} - Random ID
 */
export const generateRandomId = (prefix = "", length = 8) => {
  const randomPart = Math.random()
    .toString(36)
    .substring(2, 2 + length);
  return `${prefix}${randomPart}`;
};
