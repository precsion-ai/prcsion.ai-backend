import { Router } from "express";
import multer from "multer";
import { getPriceSuggestion } from "../../services/openaiService.js";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

/**
 * POST /v1/price
 * Accepts JSON (text-only) or multipart (images + text).
 * Field name for files must be "images".
 */
router.post("/", upload.array("images", 3), async (req, res) => {
    try {
        const isMultipart = !!req.files?.length;
        const body = isMultipart ? req.body : req.body || {};

        const payload = {
            title: (body.title || "").trim(),
            description: (body.description || "").trim(),
            category: (body.category || "").trim(),
            brand: (body.brand || "").trim(),
            size: (body.size || "").trim(),
            condition: (body.condition || "").trim(),
            // pass files (buffers + mimetypes) if any
            files: (req.files || []).map(f => ({ buffer: f.buffer, mimetype: f.mimetype }))
        };

        if (!payload.title && !isMultipart) {
            return res.status(400).json({ success: false, message: "title required (or provide images)" });
        }

        const result = await getPriceSuggestion(payload); // should handle both paths
        return res.json({ success: true, data: result });
    } catch (e) {
        console.error("v1/price error:", e);
        return res.status(500).json({ success: false, message: "Failed to get price" });
    }
});

export default router;