// controllers/priceFromImagesController.js
import { analyzeImagesAndDraft, getPriceSuggestion } from "../services/openaiService.js";

export const priceFromImages = async (req, res, next) => {
    try {
        // 1) Grab optional text fields from multipart form
        const title = (req.body.title || "").trim();
        const description = (req.body.description || "").trim();
        const category = (req.body.category || "").trim();

        // 2) Files come from multer
        const files = (req.files || []).map(f => ({
            buffer: f.buffer,
            mimetype: f.mimetype
        }));

        if (!files.length && !title && !description) {
            return res.status(400).json({ success: false, message: "Provide at least one image or a title/description." });
        }

        // 3) Run vision to extract attributes (brand/category/…)
        const vision = files.length ? await analyzeImagesAndDraft({ files, notes: description }) : null;

        // 4) Build comps hint from vision attributes
        const userTitle   = (title || "").trim();
        const userNotes   = (description || "").trim();
        const userCat     = (category || "").trim();
        const attrs       = vision?.attributes || null;

// optional: you can drop compsHint entirely if your service builds the query
// from title + attrs. If you keep it, include the title explicitly.
        const compsHint = [
            userTitle ? `"${userTitle}"` : "",   // keep full quoted title
            attrs?.brand,
            attrs?.subCategory || attrs?.category,
            "sold", "Grailed", "Depop", "eBay"
        ].filter(Boolean).join(" ");


        const enriched = {
            title: (title || "").trim(),                         // keep full user title
            description: (description || vision?.draftDescription || "").trim(),
            category: (category || attrs?.category || "").trim(),
            brand: attrs?.brand || "",
            size: "",
            condition: attrs?.visibleCondition || "",
            material: Array.isArray(attrs?.materials) ? attrs.materials.join(", ") : "",
            visionAttrs: attrs                                   // ← pass to service
        };

        // 6) Price with comps
        const priced = await getPriceSuggestion(enriched);

        // 7) Respond with both pricing + what we inferred (helps the UI)
        return res.json({
            success: true,
            data: {
                pricing: priced,
                vision: vision || null,
                usedCompsHint: compsHint || null
            }
        });

    } catch (err) {
        err.status ||= 500;
        return next(err);
    }
};