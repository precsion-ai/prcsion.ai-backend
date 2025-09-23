// ====== CONFIG ======
const API_BASE = "http://localhost:5050"; // change to your deployed URL later
// ====================

const $ = (id) => document.getElementById(id);

function showLoad(el, on) {
    const spin = $(el);
    if (on) spin.classList.remove("hidden");
    else spin.classList.add("hidden");
}
function setStatus(el, msg) { $(el).textContent = msg || ""; }

async function fetchWithTimeout(resource, options = {}) {
    const { timeout = 35000 } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);
    try { return await fetch(resource, { ...options, signal: controller.signal }); }
    finally { clearTimeout(id); }
}

// Predict Price (images + text), then auto-generate description
$("btnPredict").addEventListener("click", async () => {
    const title = $("title").value.trim();
    const category = $("category").value.trim();
    const description = $("description").value.trim();
    const files = $("images").files;

    const priceOut = $("priceResult");
    const attrsOut = $("visionAttrs");
    const descOut = $("descResult");

    priceOut.innerHTML = "";
    attrsOut.classList.add("hidden"); attrsOut.innerHTML = "";
    descOut.textContent = "";

    showLoad("spinP", true);
    setStatus("statusP", "Working…");

    try {
        // multipart payload
        const fd = new FormData();
        [...files].slice(0,4).forEach(f => fd.append("images", f));
        if (title) fd.append("title", title);
        if (category) fd.append("category", category);
        if (description) fd.append("description", description);

        // 1) price via /predict-price-from-images
        const res = await fetchWithTimeout(`${API_BASE}/predict-price-from-images`, {
            method: "POST",
            body: fd,
            timeout: 50000
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok || !json.success) throw new Error(json?.message || `Request failed (${res.status})`);

        const { pricing, vision, usedCompsHint } = json.data || {};
        if (!pricing) throw new Error("No pricing returned");

        priceOut.innerHTML = `
      <span class="pill"><strong>$${pricing.price}</strong> USD</span>
      <span class="pill">Range: $${pricing.lower} – $${pricing.upper}</span>
      <span class="pill">Confidence: ${(pricing.confidence*100).toFixed(0)}%</span>
      ${usedCompsHint ? `<div class="muted" style="margin-top:6px;">query: ${usedCompsHint}</div>` : ""}
    `;

        // show inferred attrs (brand/color/materials/cond) if present
        if (vision && vision.attributes) {
            const a = vision.attributes;
            const chips = [
                a.brand && `Brand: ${a.brand}`,
                a.category && `Category: ${a.category}`,
                a.subCategory && `Sub: ${a.subCategory}`,
                a.color && `Color: ${a.color}`,
                Array.isArray(a.materials) && a.materials.length ? `Materials: ${a.materials.join(", ")}` : "",
                a.visibleCondition && `Cond: ${a.visibleCondition}`
            ].filter(Boolean).map(t => `<span class="pill">${t}</span>`).join(" ");
            const draft = vision.draftDescription ? `<div class="muted" style="margin-top:6px;">draft: ${vision.draftDescription}</div>` : "";
            attrsOut.innerHTML = `${chips}${draft}`;
            if (chips || draft) attrsOut.classList.remove("hidden");
        }

        // 2) auto-generate final description (stick to user’s chosen style card)
        const dtitle = $("dtitle");
        const ddesc  = $("ddesc");
        if (!dtitle.value && title) dtitle.value = title;

        // seed = vision draft + user notes
        const seed = [vision?.draftDescription, description].filter(Boolean).join(" ");
        if (!ddesc.value && seed) ddesc.value = seed;

        if (dtitle.value || ddesc.value) {
            showLoad("spinD", true);
            setStatus("statusD", "Generating…");
            const r2 = await fetchWithTimeout(`${API_BASE}/generate-description`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: dtitle.value || title,
                    description: ddesc.value || seed || description,
                    style: $("dstyle").value
                }),
                timeout: 25000
            });
            const j2 = await r2.json();
            if (!r2.ok || !j2.success) throw new Error(j2.message || "Failed to generate description");
            descOut.textContent = j2.data.description || "";
        }
    } catch (e) {
        priceOut.innerHTML = `<div class="mono">Error: ${e.message}</div>`;
    } finally {
        showLoad("spinP", false);
        setStatus("statusP", "");
        showLoad("spinD", false);
        setStatus("statusD", "");
    }
});

// Manual Generate (unchanged)
$("btnDescribe").addEventListener("click", async () => {
    const title = $("dtitle").value.trim();
    const description = $("ddesc").value.trim();
    const style = $("dstyle").value;
    const out = $("descResult");
    showLoad("spinD", true);
    setStatus("statusD", "Generating…");
    out.textContent = "";
    try {
        const res = await fetchWithTimeout(`${API_BASE}/generate-description`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title, description, style }),
            timeout: 25000
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || "Error");
        out.textContent = data.data.description;
    } catch (e) {
        out.innerHTML = `<div class="mono">Error: ${e.message}</div>`;
    } finally {
        showLoad("spinD", false);
        setStatus("statusD", "");
    }
});