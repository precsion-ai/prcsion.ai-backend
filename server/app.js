import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";

import priceRoutes from "./routes/priceRoutes.js";

const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use(limiter);

app.get("/healthz", (req, res) => res.json({ ok: true }));

// mount routes
app.use("/predict-price", priceRoutes);

import descriptionRoutes from "./routes/descriptionRoutes.js";
app.use("/generate-description", descriptionRoutes);

// central error handler
app.use((err, req, res, _next) => {
    console.error(err);
    res.status(err.status || 500).json({
        success: false,
        message: err.message || "Server error"
    });
});

import imageRoutes from "./routes/imageRoutes.js";
app.use("/analyze-images", imageRoutes);

export default app;