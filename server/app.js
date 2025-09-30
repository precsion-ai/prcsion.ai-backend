import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";


import priceRoute from "./routes/price.js";
import descriptionRoute from "./routes/descriptionRoutes.js";



// import visionRoute from "./routes/vision.js";          // if/when you split vision



// keep legacy endpoints working
app.use("/predict-price", priceRoute);
app.use("/generate-description", descriptionRoute);

// ✅ versioned endpoints your extension uses
app.use("/v1/price", priceRoute);
app.use("/v1/describe", descriptionRoute);



const app = express();
app.set("trust proxy", 1);

app.use(cors());
app.use(helmet());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("dev"));

// keep legacy endpoints working
app.use("/predict-price", priceRoute);
app.use("/generate-description", descriptionRoute);

// ✅ versioned endpoints your extension uses
app.use("/v1/price", priceRoute);
app.use("/v1/describe", descriptionRoute);

const limiter = rateLimit({ windowMs: 60 * 1000, max: 30 });
app.use(limiter);

app.get("/healthz", (req, res) => res.json({ ok: true }));


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