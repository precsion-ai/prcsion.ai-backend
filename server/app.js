// app.js — single-file server (Express 5, ESM)
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

// === ROUTERS  ===
// Unified price route that can handle JSON or multipart (images)
import priceRoute from "./routes/price.js";
// Old images-only price route (keep as legacy alias if you still use it)
import priceFromImagesRoute from "./routes/priceFromImages.js";
// Description route (POST "/")
import descriptionRoute from "./routes/descriptionRoutes.js";
// Vision/images analysis route (POST "/") — optional
import imageRoutes from "./routes/imageRoutes.js";



const app = express();

// ---------- CORE MIDDLEWARE ----------
app.set("trust proxy", 1);
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ---------- CORS ----------
// DEV: permissive by default. To restrict, set CORS_MODE=restricted and EXT_IDS / ORIGIN_ALLOWLIST envs.
const CORS_MODE = (process.env.CORS_MODE || "permissive").toLowerCase();
// e.g. EXT_IDS="abc...123,xyz...789"
const EXT_IDS = (process.env.EXT_IDS || "gaefhcahhbkgmgnndfodaajlnaefhcpp").split(",").map(s => s.trim()).filter(Boolean);
// e.g. ORIGIN_ALLOWLIST="https://yourapp.com,https://pricyse.onrender.com"
const ORIGIN_ALLOWLIST = (process.env.ORIGIN_ALLOWLIST || [
    // Chrome extension (popup, content scripts)
    `chrome-extension://${EXT_IDS}`,

    // Local dev (frontend running locally)
    "http://localhost:3000",
    "http://127.0.0.1:3000",

    // Backend itself (health checks, Render)
    "https://pricyse.onrender.com"
]
)
    .split(",").map(s => s.trim()).filter(Boolean);

// Always allow your production host
const DEFAULT_ALLOW = ["https://pricyse.onrender.com"];
const ALLOWLIST = new Set([
    ...DEFAULT_ALLOW,
    ...ORIGIN_ALLOWLIST,
    ...EXT_IDS.map(id => `chrome-extension://${id}`)
]);

if (CORS_MODE === "restricted") {
    app.use(cors({
        origin(origin, cb) {
            // allow no-origin (curl/postman) and allowlisted origins
            if (!origin || ALLOWLIST.has(origin)) return cb(null, true);
            return cb(new Error("Not allowed by CORS: " + origin));
        },
        methods: ["GET", "POST", "OPTIONS"],
        allowedHeaders: ["Content-Type", "x-api-key"],
        credentials: false
    }));
} else {
    // Permissive (best for dev/testing & multiple dev extension IDs)
    app.use(cors());
}

// Security & logs
app.use(helmet());
app.use(morgan("dev"));

// Basic rate limit (per IP)
app.use(rateLimit({ windowMs: 60 * 1000, max: 60 }));

// ---------- HEALTH ----------
app.get("/healthz", (_req, res) => res.json({ ok: true }));

// ---------- VERSIONED API (use these in your extension) ----------
app.use("/v1/price", priceRoute);               // POST /v1/price (JSON or multipart with field "images")
app.use("/v1/describe", descriptionRoute);      // POST /v1/describe
app.use("/v1/vision", imageRoutes);             // POST /v1/vision (optional)




// ---------- LEGACY ALIASES (keep during transition; remove later) ----------
app.use("/predict-price", priceRoute);
app.use("/predict-price-from-images", priceFromImagesRoute);
app.use("/generate-description", descriptionRoute);
app.use("/analyze-images", imageRoutes);

// ---------- 404 ----------
app.use((req, res, _next) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`,
    });
});

// ---------- ERROR HANDLER ----------
app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error",
    });
});

// ---------- START SERVER ----------
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => {
    console.log(`server running on :${PORT}`);
});