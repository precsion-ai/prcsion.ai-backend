import { Router } from "express";
import { validate } from "../middlewares/validate.js";
import { descriptionRequestSchema } from "../utils/schemas.js";
import { generateDescription } from "../controllers/descriptionController.js";

const router = Router();
router.post("/", validate(descriptionRequestSchema), generateDescription);

export default router;