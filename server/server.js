import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

import priceFromImagesRoute from "./routes/priceFromImages.js";

const EXT_ID = process.env.EXT_ID || "gaefhcahhbkgmgnndfodaajlnaefhcpp";
const allowlist = [
    `chrome-extension://${EXT_ID}`,
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "https://pricyse.onrender.com"
];

app.use(cors({
    origin: function (origin, cb) {
        // allow no-origin (e.g., curl/postman) and allowlisted origins
        if (!origin || allowlist.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS: " + origin));
    },
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "x-api-key"],
    credentials: false
}));

app.post("/v1/describe", async (req, res) => {
    try {
        const { title, description, style = "friendly" } = req.body || {};
        if (!title || !description) {
            return res.status(400).json({ success: false, message: "title and description required" });
        }
        // call your existing service function
        const text = await getTailoredDescription({ title, description, style });
        return res.json({ success: true, data: { description: text } });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ success: false, message: "Failed to generate description." });
    }
});

// ...after app.use(express.json(...))
app.use("/predict-price-from-images", priceFromImagesRoute);
// server.js
import cors from "cors";
// dev: permissive
app.use(cors({ origin: true }));

// app.use(cors({ origin: [/^chrome-extension:\/\//, "http://localhost:5050"] }));
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`server running on :${PORT}`));