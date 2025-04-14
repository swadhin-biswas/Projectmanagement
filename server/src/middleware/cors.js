import { cors } from "@elysiajs/cors";
import { config } from "dotenv";

// Load environment variables
config();

export const elysiaCorsMiddleware = () => {
  const allowedOrigins =
    process.env.NODE_ENV === "production"
      ? [process.env.PRODUCTION_CLIENT_URL]
      : [
          "http://localhost:5173",
          "http://localhost:3000",
          "http://localhost",
          "http://127.0.0.1",
          "http://127.0.0.0",
          "http://127.0.0.1:3000",
          "http://127.0.0.1:5173",
          "http://127.0.0.0:3000",
          "http://127.0.0.0:5173",
          "http://[::1]",
          "http://[::1]:3000",
          "http://[::1]:5173",
        ];

  const corsOptions = {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
      "Content-Length",
      "Content-Disposition",
      "user-agent",
      "sec-fetch-mode",
      "sec-fetch-dest",
      "referer",
      "accept-encoding",
      "accept-language",
      "sec-fetch-site",
    ],
    exposedHeaders: [
      "Content-Length",
      "Content-Disposition",
      "Content-Type",
      "host",
      "connection",
      "accept",
      "access-control-request-method",
      "access-control-request-headers",
      "origin",
      "user-agent",
      "sec-fetch-mode",
      "sec-fetch-dest",
      "referer",
      "accept-encoding",
      "accept-language",
      "sec-fetch-site",
    ],
    credentials: true,
    preflight: {
      statusCode: 204,
      cacheControl: "no-cache",
    },
    maxAge: 3600,
    strictPreflight: false,
  };

  // Return a function that accepts the app instance and applies cors
  return (app) => app.use(cors(corsOptions));
};
