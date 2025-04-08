import { createServer } from "net";

/**
 * Checks if a port is available
 * @param {number} port - The port to check
 * @returns {Promise<boolean>} - True if available, false if in use
 */
export const isPortAvailable = (port) => {
  return new Promise((resolve) => {
    const server = createServer();

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

/**
 * Finds an available port starting from the given port
 * @param {number} startPort - The port to start checking from
 * @returns {Promise<number>} - The first available port
 */
export const findAvailablePort = async (startPort = 3000) => {
  let port = startPort;

  while (!(await isPortAvailable(port))) {
    port++;
    if (port > 65535) {
      throw new Error("No available ports found");
    }
  }

  return port;
};
