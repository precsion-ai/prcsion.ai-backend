import { Router } from "express";
import { predictPrice } from "../controllers/priceController.js";
import { validate } from "../middlewares/validate.js";
import { priceRequestSchema } from "../utils/schemas.js";

const router = Router();
router.post("/", validate(priceRequestSchema), predictPrice);
export default router;