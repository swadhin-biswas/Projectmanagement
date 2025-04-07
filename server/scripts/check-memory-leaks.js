/**
 * This script can be used to diagnose memory leaks in the application.
 * Run it alongside the main server to monitor memory usage trends.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Get the directory name of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CHECK_INTERVAL = 30000; // Check every 30 seconds
const LOGS_DIR = path.join(__dirname, "../logs");
const LOG_FILE = path.join(LOGS_DIR, "memory-usage.log");

// Create logs directory if it doesn't exist
if (!fs.existsSync(LOGS_DIR)) {
  fs.mkdirSync(LOGS_DIR, { recursive: true });
}

// Ensure the log file exists
if (!fs.existsSync(LOG_FILE)) {
  fs.writeFileSync(
    LOG_FILE,
    "timestamp,rss,heapTotal,heapUsed,external,arrayBuffers\n"
  );
}

// Tracking variables for memory growth detection
let lastHeapUsed = 0;
let consecutiveGrowth = 0;

/**
 * Log current memory usage
 */
function logMemoryUsage() {
  const usage = process.memoryUsage();

  // Convert bytes to MB for readability
  const rss = Math.round((usage.rss / 1024 / 1024) * 100) / 100;
  const heapTotal = Math.round((usage.heapTotal / 1024 / 1024) * 100) / 100;
  const heapUsed = Math.round((usage.heapUsed / 1024 / 1024) * 100) / 100;
  const external = Math.round((usage.external / 1024 / 1024) * 100) / 100;
  const arrayBuffers =
    Math.round(((usage.arrayBuffers || 0) / 1024 / 1024) * 100) / 100;

  // Check for consecutive heap growth (potential memory leak)
  if (heapUsed > lastHeapUsed) {
    consecutiveGrowth++;
    if (consecutiveGrowth >= 5) {
      console.warn(
        `\x1b[33m⚠️ WARNING: Heap memory continuously growing for ${consecutiveGrowth} checks! Possible memory leak.\x1b[0m`
      );
    }
  } else {
    consecutiveGrowth = 0;
  }
  lastHeapUsed = heapUsed;

  // Log to file (CSV format)
  const timestamp = new Date().toISOString();
  fs.appendFileSync(
    LOG_FILE,
    `${timestamp},${rss},${heapTotal},${heapUsed},${external},${arrayBuffers}\n`
  );

  // Log to console
  console.log(
    `Memory Usage (MB) - RSS: ${rss}, Heap Total: ${heapTotal}, Heap Used: ${heapUsed}, External: ${external}, Array Buffers: ${arrayBuffers}`
  );
}

// Start monitoring
console.log(
  `\x1b[32m📊 Starting memory usage monitoring. Logging to ${LOG_FILE}\x1b[0m`
);
logMemoryUsage();

// Set up interval to periodically log memory usage
setInterval(logMemoryUsage, CHECK_INTERVAL);

// Listen for process termination
process.on("SIGINT", () => {
  console.log(
    "\n\x1b[32m📊 Memory monitoring stopped. Check the log file for analysis.\x1b[0m"
  );
  process.exit(0);
});
