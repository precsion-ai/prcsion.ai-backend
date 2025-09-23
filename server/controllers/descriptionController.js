import { asyncHandler } from "../middlewares/asyncHandler.js";
import { getTailoredDescription } from "../services/openaiService.js";

export const generateDescription = asyncHandler(async (req, res) => {
    const { title, description, style } = req.validated;
    const tailored = await getTailoredDescription({ title, description, style });
    res.json({ success: true, data: { description: tailored } });
});