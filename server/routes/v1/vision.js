import { Router } from "express";
import multer from "multer";
import { analyzeImagesAndDraft } from "../../services/openaiService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

router.post("/", upload.array("images", 4), async (req, res) => {
    try {
        if (!req.files?.length) {
            return res.status(400).json({ success: false, message: "images required" });
        }
        const notes = (req.body?.notes || "").trim();
        const vision = await analyzeImagesAndDraft({ files: req.files, notes });
        res.json({ success: true, data: vision });
    } catch (e) {
        console.error("v1/vision error:", e);
        res.status(500).json({ success: false, message: "Failed to analyze images" });
    }
});

export default router;