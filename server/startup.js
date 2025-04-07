import { spawn } from "child_process";
import { config } from "dotenv";
import fs from "fs";
import net from "net";
import path from "path";

// Load environment variables
config();

// Check if required files exist
const requiredFiles = [
  "./src/index.js",
  "./src/routes/dashboardRoutes.js",
  "./src/routes/sessionRoutes.js",
  "./src/controllers/adminController.js",
];

console.log("🔍 Checking for required files...");
requiredFiles.forEach((file) => {
  try {
    fs.accessSync(path.resolve(process.cwd(), file));
    console.log(`✅ ${file} exists`);
  } catch (err) {
    console.error(`❌ ${file} is missing or inaccessible`);
  }
});

// Function to check if a port is available
const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(false);
      } else {
        resolve(false);
      }
    });

    server.once("listening", () => {
      server.close();
      resolve(true);
    });

    server.listen(port);
  });
};

// Function to find an available port starting from a base port
const findAvailablePort = async (basePort) => {
  let port = basePort;
  const maxPort = basePort + 10; // Try up to 10 ports

  while (port <= maxPort) {
    if (await isPortAvailable(port)) {
      return port;
    }
    port++;
  }

  throw new Error(
    `Could not find an available port in range ${basePort}-${maxPort}`
  );
};

// Main function to start the server
const startServer = async () => {
  try {
    const basePort = parseInt(process.env.PORT || 3000);
    const availablePort = await findAvailablePort(basePort);

    console.log(`✅ Found available port: ${availablePort}`);
    console.log(`🚀 Starting server...`);

    // Set the port in environment and start server
    process.env.PORT = availablePort.toString();

    // Use spawn instead of exec to handle output streaming properly
    const serverProcess = spawn("bun", ["--watch", "src/index.js"], {
      env: { ...process.env, PORT: availablePort.toString() },
      stdio: "inherit",
    });

    // Handle server process events
    serverProcess.on("error", (error) => {
      console.error(`❌ Failed to start server: ${error.message}`);
      process.exit(1);
    });

    process.on("SIGINT", () => {
      console.log("Stopping server...");
      serverProcess.kill();
      process.exit(0);
    });
  } catch (error) {
    console.error(`❌ ${error.message}`);
    process.exit(1);
  }
};

// Start the server
startServer();
