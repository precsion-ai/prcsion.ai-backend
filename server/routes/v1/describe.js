
import { Router } from "express";
import { getTailoredDescription } from "../../services/openaiService.js";

const router = Router();

router.post("/", async (req, res) => {
    try {
        const { title, description, style = "friendly" } = req.body || {};
        if (!title || !description) {
            return res.status(400).json({ success: false, message: "title and description required" });
        }
        const text = await getTailoredDescription({ title, description, style });
        res.json({ success: true, data: { description: text } });
    } catch (e) {
        console.error("v1/describe error:", e);
        res.status(500).json({ success: false, message: "Failed to generate description" });
    }
});

export default router;