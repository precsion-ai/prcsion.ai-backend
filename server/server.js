import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";

import priceFromImagesRoute from "./routes/priceFromImages.js";

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