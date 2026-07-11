import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import claimsRouter from "./routes/claims.route.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;

// ─── Middleware ────────────────────────────────────────────────────────────────

app.use(express.json({ limit: "50kb" }));

// CORS: In production, restrict to your extension ID origin
app.use(
  cors({
    origin: process.env.NODE_ENV === "production"
      ? (origin, callback) => {
          // Allow Chrome Extension origins and localhost for development
          const allowed = /^chrome-extension:\/\//.test(origin ?? "") || !origin;
          callback(null, allowed);
        }
      : true,
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "X-Api-Key"],
  })
);

// Rate limiting: 20 requests per minute per IP
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? "60000"),
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? "20"),
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Too many requests. Please wait before submitting another claim.",
    retryAfter: 60,
  },
});

app.use("/api/", limiter);

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/v1/claims", claimsRouter);

// Root health check
app.get("/", (_req, res) => {
  res.json({ name: "Verdict API", version: "1.0.0", status: "running" });
});

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found." });
});

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("❌ Unhandled error:", err.message);
  res.status(500).json({
    error: "An internal server error occurred.",
    ...(process.env.NODE_ENV !== "production" && { detail: err.message }),
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`✅ Verdict API running at http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV ?? "development"}`);
  console.log(`   Gemini key: ${process.env.GEMINI_API_KEY ? "✓ loaded" : "✗ MISSING"}`);
});
