// services/openaiService.js
// ESM module

import OpenAI from "openai";
import { z } from "zod";
import dotenv from 'dotenv';
dotenv.config();

const client = new OpenAI({
    apiKey: "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\n",
    project: process.env.OPENAI_PROJECT_ID // needed if you use sk-proj- keys
});


/* ----------------------------- Shared helpers ----------------------------- */



// Keep numbers, roman numerals, dashes; strip noisy punctuation



function toCompsHintFromVision(attrs) {
    if (!attrs) return "";
    const parts = [];
    if (attrs.brand) parts.push(attrs.brand);
    if (attrs.category) parts.push(attrs.category);
    if (attrs.subCategory) parts.push(attrs.subCategory);
    if (attrs.color) parts.push(attrs.color);
    // add safe generic words that bias toward the right comps
    parts.push("sold", "Grailed", "Depop", "eBay");
    return parts.filter(Boolean).join(" ");
}

const clampUSD = (n) => Math.max(3, Math.min(2000, Math.round(Number(n))));

/** STRICT price extraction:
 * - Only accept values with a leading $ or a trailing "USD"
 * - Ignores dates / "90 days" etc.
 * - Dedups and sorts
 */
function extractUsdPrices(text) {
    if (!text) return [];
    const prices = [];

    // SOLD $123 (optionally cents), $ 123.00, etc.
    const dollarRegex = /(?:\bSOLD\b[^$]*)?\$\s*([1-9]\d{1,4})(?:\.\d{1,2})?/gi;
    // 123 USD (optionally cents)
    const usdRegex = /\b([1-9]\d{1,4})(?:\.\d{1,2})?\s*USD\b/gi;

    let m;
    while ((m = dollarRegex.exec(text)) !== null) {
        const n = Number(m[1]);
        if (n >= 3 && n <= 2000) prices.push(n);
    }
    while ((m = usdRegex.exec(text)) !== null) {
        const n = Number(m[1]);
        if (n >= 3 && n <= 2000) prices.push(n);
    }

    const uniq = [...new Set(prices)];
    return uniq.sort((a, b) => a - b);
}

function stats(prices) {
    if (!prices?.length) return null;
    const xs = prices.slice().sort((a, b) => a - b);
    const mid = Math.floor(xs.length / 2);
    const median = xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
    const p25 = xs[Math.floor(0.25 * (xs.length - 1))];
    const p75 = xs[Math.floor(0.75 * (xs.length - 1))];
    const iqr = Math.max(1, p75 - p25);
    return { median, p25, p75, iqr, min: xs[0], max: xs[xs.length - 1], n: xs.length };
}

function normalizeSpaces(s){ return (s||"").replace(/\s+/g," ").trim(); }

function sanitizeTitleForSearch(title){
    return normalizeSpaces(title)
        .replace(/[“”"’‘']/g,'"').replace(/[(){}\[\]]/g," ")
        .replace(/[\u2013\u2014]/g,"-").replace(/[^A-Za-z0-9\-\/&\s]/g," ")
        .replace(/\s+/g," ").trim();
}
function quote(s){ s = normalizeSpaces(s); return s ? `"${s}"` : ""; }

// Normalize common color/material variants to stable tokens
function normalizeColor(c){
    c = (c||"").toLowerCase();
    const map = {
        grey: "gray", charcoal: "dark gray", "heather grey": "heather gray",
        "heather grey/gray": "heather gray"
    };
    return map[c] || c;
}
function normalizeMaterials(arr){
    if (!Array.isArray(arr)) return [];
    const alias = {
        cotton:"cotton", polyester:"polyester", fleece:"fleece",
        wool:"wool", nylon:"nylon", leather:"leather", suede:"suede",
        denim:"denim", acrylic:"acrylic", rayon:"rayon", spandex:"spandex",
        elastane:"spandex", viscose:"viscose"
    };
    return [...new Set(arr.map(x => (alias[(x||"").toLowerCase()] || (x||"").toLowerCase())).filter(Boolean))];
}

function constructCompsQuery({ title, brand, category, visionAttrs, size, condition }) {
    const cleanTitle = sanitizeTitleForSearch(title || "");
    const qTitle = quote(cleanTitle);
    const qAlt   = quote(cleanTitle.replace(/\b(zip[-\s]?up|hoodie|sneakers?)\b/i, "").trim());

    const color = normalizeColor(visionAttrs?.color || "");
    const mats  = normalizeMaterials(visionAttrs?.materials || []);

    const bits = [
        qTitle,
        qAlt,
        brand && quote(brand),
        color && quote(color),
        mats.length ? quote(mats.slice(0,2).join(" ")) : "",
        size && quote(size),                    // 🔹 NEW
        condition && quote(condition),          // 🔹 NEW
        "sold", "Grailed", "Depop", "eBay"
    ].filter(Boolean);

    const seen = new Set();
    return bits.filter(b => (seen.has(b) ? false : seen.add(b))).join(" ");
}

/* ----------------------------- Zod validations ---------------------------- */

const PriceZ = z.object({
    price: z.number().min(3).max(2000),
    currency: z.literal("USD"),
    confidence: z.number().min(0).max(1),
    lower: z.number().min(3).max(2000),
    upper: z.number().min(3).max(2000)
});

const VisionZ = z.object({
    attributes: z.object({
        category: z.string().optional(),
        subCategory: z.string().optional(),
        brand: z.string().optional(),
        color: z.string().optional(),
        pattern: z.string().optional(),
        materials: z.array(z.string()).optional(),
        visibleCondition: z.string().optional(),
        notableDetails: z.array(z.string()).optional()
    }),
    draftDescription: z.string().min(8).max(280),
    confidence: z.number().min(0).max(1)
});

/* --------------------------- Comps (Responses API) ------------------------ */
/** Pull concise SOLD comps lines via web_search.
 * Always emits plain text bullets or "NO SOLD COMPS FOUND".
 */
async function fetchCompsSummary(queryStr) {
    try {
        const r = await client.responses.create({
            model: process.env.TEXT_MODEL || "gpt-4.1",
            tool_choice: { type: "web_search" },           // force the tool
            tools: [{ type: "web_search",
                search_context_size: "high",
                filters: {

                    allowed_domains: ["grailed.com", "depop.com", "ebay.com", "mercari.com"]
                    // (optional) blocked_domains: []
                }
                 }],
            // Make the model return consistent, parseable lines
            instructions:
                "Use web_search with the provided query. Return 3–8 lines ONLY in this format:\n" +
                "- SITE | ITEM | $PRICE | YYYY-MM\n" +
                "Rules: only pages (Grailed/Depop/eBay sold). Each line MUST include a $ price. " +
                "If none are found, output exactly: THERE IS NO MARKET FOR THE PRODUCT.",
            input:
                `QUERY: ${queryStr}\n` +
                `Priority domains: grailed.com, depop.com, ebay.com (sold/completed). Exclude retail.`,
            max_output_tokens: 600
        });

        const summary =
            r.output_text?.trim() ||
            (Array.isArray(r.output)
                ? (r.output.find(o => o.type === "message")?.content?.[0]?.text || "").trim()
                : "");

        console.log("COMPS RAW:\n" + (summary?.split("\n").slice(0, 6).join("\n") || "(empty)"));
        return summary || "NO SOLD COMPS FOUND";
    } catch (e) {
        console.error("fetchCompsSummary failed:", e.message);
        return "NO SOLD COMPS FOUND";
    }
}

/* ------------------------------- Pricing API ------------------------------ */
/** Pricing via Chat JSON mode + comps anchoring + brand guardrail */
    // 1) Pull comps + compute numeric anchors
export async function getPriceSuggestion({
                                                 title, description, category, brand, condition, size, material, visionAttrs
                                             }) {
        const searchQuery = constructCompsQuery({ title, brand, category, visionAttrs });
        console.log("COMPS QUERY:", searchQuery);

        const compsText = await fetchCompsSummary(searchQuery);

        let compPrices = extractUsdPrices(compsText);
        if (compPrices.length >= 4) {
            const sorted = compPrices.slice().sort((a,b)=>a-b);
            compPrices = sorted.slice(1, sorted.length - 1); // trim one outlier on both ends
        }
        const compStats = stats(compPrices);


        // 2) Build prompt with numeric anchors when available
    const sys =
        `You are a secondhand marketplace pricing engine.\n` +
        `Output ONLY valid JSON:\n` +
        `{ "price": number, "currency": "USD", "confidence": number (0..1), "lower": number, "upper": number }\n` +
        `Rules:\n` +
        `- USD values clamped to 3..2000.\n` +
        `- Ensure lower ≤ price ≤ upper.\n` +
        `- If numeric sold-comps are provided, anchor your estimate to their central tendency (median) and typical range.`;

    const compsBlock = compStats && compStats.n >= 2
        ? `SOLD COMPS STATS (authoritative):
- median: ${compStats.median} USD
- typical range (IQR-ish): ${compStats.p25}-${compStats.p75} USD
- n: ${compStats.n}
(Use this band unless title/condition clearly justify deviation.)`
        : "(No reliable numeric comps parsed)";

    const user =
        `Listing:\n` +
        `- Title: ${title}\n` +
        `- Description: ${description}\n` +
        `- Category: ${category}\n` +
        `- Brand: ${brand || "(unknown)"}; Condition: ${condition || "(unknown)"}; Size: ${size || "(unknown)"}; Material: ${material || "(unknown)"}\n\n` +
        `${compsBlock}\n\n` +
        `Output: ONLY the JSON object.`;

    // 3) Chat JSON mode — freshness is provided by compsBlock
    const r = await client.chat.completions.create({
        model: "gpt-4o",
        temperature: 0,
        max_tokens: 220,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: sys },
            { role: "user", content: user }
        ]
    });

    const content = r?.choices?.[0]?.message?.content;
    if (!content) {
        console.error("Pricing empty content", {
            finish_reason: r?.choices?.[0]?.finish_reason,
            usage: r?.usage
        });
        const err = new Error("Pricing model returned no content");
        err.status = 502;
        throw err;
    }

    let json;
    try {
        json = JSON.parse(content);
    } catch {
        console.error("Pricing JSON parse failed. First 200 chars:", String(content).slice(0, 200));
        const err = new Error("Pricing output was not valid JSON");
        err.status = 502;
        throw err;
    }

    // 4) Normalize base output
    let price = clampUSD(json.price);
    let lower = clampUSD(json.lower ?? price - 10);
    let upper = clampUSD(json.upper ?? price + 15);
    let confidence = Math.max(0, Math.min(1, Number(json.confidence ?? 0.65)));

    // 5) Post-process with comps guardrails (only if we have ≥2 real prices)
    if (compStats && compStats.n >= 2) {
        const m = compStats.median;
        const tooLow = price < 0.6 * m;
        const tooHigh = price > 1.4 * m;

        if (tooLow || tooHigh) {
            // snap to median-centered band
            price = clampUSD(m);
            lower = clampUSD(Math.min(compStats.p25, m - Math.max(10, 0.2 * m)));
            upper = clampUSD(Math.max(compStats.p75, m + Math.max(15, 0.25 * m)));
            confidence = Math.max(confidence, 0.7);
        } else {
            // blend gently toward comps
            price = clampUSD(0.7 * price + 0.3 * m);
            lower = clampUSD(Math.min(lower, Math.min(m, compStats.p25)));
            upper = clampUSD(Math.max(upper, Math.max(m, compStats.p75)));
        }

        if (!(lower <= price && price <= upper)) {
            lower = clampUSD(Math.min(price - 10, price - 5));
            upper = clampUSD(Math.max(price + 10, price + 15));
        }
    } else {
        // 6) No reliable comps — add a small brand/category prior (prevents $40 for high-heat streetwear)
        const txt = `${title} ${brand || ""}`.toLowerCase();
        const highHeatBrands = [
            "gv gallery", "gallery dept", "aimé leon dore", "aime leon dore",
            "our legacy", "kapital", "needles", "represent", "stone island",
            "stussy", "palace", "off-white", "yeezy", "fear of god", "essentials"
        ];
        const looksHighHeat = highHeatBrands.some(b => txt.includes(b));
        const looksHoodie = `${category} ${title}`.toLowerCase().includes("hoodie");

        if (looksHighHeat && looksHoodie && price < 120) {
            const prior = 220;
            price = clampUSD(0.5 * price + 0.5 * prior);
            lower = clampUSD(Math.min(lower, prior - 40));
            upper = clampUSD(Math.max(upper, prior + 40));
            confidence = Math.max(confidence, 0.6);
        }
    }

    const result = { price, lower, upper, currency: "USD", confidence };
    const validated = PriceZ.parse(result);
    return { ...validated, _usedQuery: searchQuery };   // expose for UI
}

/* --------------------------- Description generator ------------------------ */
export async function getTailoredDescription({ title, description, style = "friendly" }) {
    const sys = `You are a copywriter for secondhand fashion listings.
Generate a concise buyer-friendly description (3-4 sentences). Adding buzzwords (If applicable if not the don't), like vintage, y2k, etc. 
No all caps, no hashtags, no unverifiable claims. 
Styles: minimal | friendly | streetwear | professional. Default friendly.`;

    const user = `Title: ${title}
Original notes: ${description}
Style: ${style}
Return only the description text.`;

    const r = await client.chat.completions.create({
        model: process.env.TEXT_MODEL || "gpt-4o",
        temperature: 0.7,
        max_tokens: 160,
        messages: [
            { role: "system", content: sys },
            { role: "user", content: user }
        ]
    });

    return r?.choices?.[0]?.message?.content?.trim() || "";
}


/* --------------------------- Vision: analyze images ----------------------- */
export async function analyzeImagesAndDraft({ files, notes }) {
    const toDataUrl = (file) => {
        const b64 = file.buffer.toString("base64");
        const prefix = file.mimetype === "image/png" ? "data:image/png;base64," : "data:image/jpeg;base64,";
        return `${prefix}${b64}`;
    };

    const imagesContent = files.slice(0, 4).map((f) => ({
        type: "image_url",
        image_url: { url: toDataUrl(f) }
    }));

    // inside analyzeImagesAndDraft > systemPrompt
    const systemPrompt = `You are a fashion listing assistant.
Return ONLY valid JSON with this shape:
{
  "attributes": {
    "category": string,
    "subCategory": string,
    "brand": string,
    "color": string,                // ← REQUIRED when visible (e.g., "gray", "heather gray")
    "pattern": string,
    "materials": string[],          // ← REQUIRED when visible (e.g., ["cotton","polyester"])
    "visibleCondition": string,
    "notableDetails": string[]
  },
  "draftDescription": string,
  "confidence": number
}
Rules:
- If color/materials can be seen, DO NOT leave them blank.
- Materials: prefer garment fiber/fabric (cotton, polyester, fleece, wool, denim, nylon, leather, suede).
- If unsure, use an empty string/array (no hallucination).`;
    const userContent = [
        { type: "text", text: `Notes (optional): ${notes || "(none)"}` },
        ...imagesContent,
        {
            type: "text",
            text: "Output ONLY the JSON object (no prose). If unknown, use empty string or empty array."
        }
    ];

    const r = await client.chat.completions.create({
        model: process.env.VISION_MODEL || "gpt-4o",
        temperature: 0,
        max_tokens: 500,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent }
        ]
    });

    const content = r?.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
        console.error("Vision response missing text content", {
            finish_reason: r?.choices?.[0]?.finish_reason,
            usage: r?.usage
        });
        const err = new Error("Vision model returned no textual JSON content");
        err.status = 502;
        throw err;
    }

    let json;
    try {
        json = JSON.parse(content);
    } catch {
        console.error("Vision JSON parse failed. First 200 chars:", String(content).slice(0, 200));
        const err = new Error("Vision output was not valid JSON");
        err.status = 502;
        throw err;
    }

    return VisionZ.parse(json);
}