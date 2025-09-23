// routes/priceFromImages.js
import { Router } from "express";
import multer from "multer";
import { priceFromImages } from "../controllers/priceFromImagesController.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } }); // 5MB per image

// POST /predict-price-from-images
// form-data: images[] (files), title (text), description (text), category (text)
router.post("/", upload.array("images", 4), priceFromImages);

export default router;