📚 Resources for Frontend Development

API Docs
	•	Base URL (production):
    https://pricyse.onrender.com
	•	Health check:
    GET /healthz → { "ok": true }
Endpoints:
  	•	POST /predict-price → price from text (JSON input)
  	•	POST /predict-price-from-images → price from images + text (multipart/form-data)
  	•	POST /generate-description → AI-tailored product description

Example curl (text-only):
  curl -X POST https://pricyse.onrender.com/predict-price \
  -H "Content-Type: application/json" \
  -d '{"title":"Nike Air Max 97","description":"Worn twice, box included","category":"Shoes > Sneakers"}'


Example curl (image + text):
  curl -X POST https://pricyse.onrender.com/predict-price-from-images \
  -F "images=@/path/to/hoodie.jpg" \
  -F "title=GV Gallery zip-up hoodie" \
  -F "description=Size L, like new" \
  -F "category=Men > Hoodies"

What to build (Phase 1: Chrome Extension UI)

Goal: A clean popup UI that:
	•	Lets users upload 1–3 images and enter title / description / category
	•	Calls your production API:
	•	POST /predict-price-from-images (multipart: images + text)
	•	POST /generate-description (JSON: text only)
	•	Shows price, range, confidence, vision attributes, and tailored description
	•	Has Copy buttons and graceful error states

Notes for your dev
	•	Use production base URL: https://pricyse.onrender.com
	•	CORS is already permissive on the API.
	•	Keep UI minimal; designer can skin later (same structure).
	•	Don’t include secrets (all AI happens server-side).
