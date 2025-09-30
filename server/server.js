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

// Helpful for some browsers/proxies
app.options("*", cors());

// ...after app.use(express.json(...))
app.use("/predict-price-from-images", priceFromImagesRoute);
// server.js
import cors from "cors";
// dev: permissive
app.use(cors({ origin: true }));
// or stricter:
// app.use(cors({ origin: [/^chrome-extension:\/\//, "http://localhost:5050"] }));
const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`server running on :${PORT}`));