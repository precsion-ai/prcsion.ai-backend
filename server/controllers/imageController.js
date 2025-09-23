import { asyncHandler } from "../middlewares/asyncHandler.js";
import { analyzeImagesAndDraft } from "../services/openaiService.js";

export const analyzeImages = asyncHandler(async (req, res) => {
    const files = req.files || [];
    const { notes } = req.validated || {};

    if (!files.length) {
        return res.status(400).json({ success:false, message:"At least one image required" });
    }

    const result = await analyzeImagesAndDraft({ files, notes });
    return res.json({ success:true, data: result });
});