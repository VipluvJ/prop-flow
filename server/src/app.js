import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import authRoutes from "./modules/auth/auth.routes.js";
import leadsRoutes from "./modules/leads/lead.routes.js";

import corsMiddleware from "./config/cors.js";

const app = express();

// Security headers
app.use(helmet());

// Cross-origin configuration
app.use(corsMiddleware);

// Parse incoming JSON
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Health check
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "PropFlow API is running",
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/leads", leadsRoutes);

export default app;
