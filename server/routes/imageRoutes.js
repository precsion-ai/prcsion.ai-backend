import { Router } from "express";
import { uploadImages } from "../middlewares/upload.js";
import { validate } from "../middlewares/validate.js";
import { imageAnalyzeSchema } from "../utils/schemas.js";
import { analyzeImages } from "../controllers/imageController.js";

const router = Router();
router.post("/", uploadImages, validate(imageAnalyzeSchema), analyzeImages);
export default router;