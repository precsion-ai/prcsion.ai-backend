import { asyncHandler } from "../middlewares/asyncHandler.js";
import { getPriceSuggestion } from "../services/openaiService.js";

export const predictPrice = asyncHandler(async (req, res) => {
    const { title, description, category } = req.validated; // from validate middleware
    const result = await getPriceSuggestion({ title, description, category });

    // last line of defense (sanity check)
    if (typeof result.price !== "number" || result.price < 3 || result.price > 2000) {
        return res.status(502).json({ success: false, message: "Unreasonable price from model" });
    }

    return res.json({ success: true, data: result });
});