# API contract (backend deployment)

The hosted MVP uses static export so it works without secrets. These contracts describe the server routes to wire when deploying a Next.js server or Worker backend:

- `POST /api/room/segment` — `{ imageUrl }` → `DetectedObject[]`; call Replicate/Fal.ai SAM or YOLO, store source/crops in Supabase Storage.
- `POST /api/products/match` — `{ cropUrl, category, tier?, maxDimensions?, inStock? }` → `Product[]`; create a CLIP/DINOv2 512-dimensional embedding and call `match_furniture`.
- `POST /api/suppliers/import` — multipart YML/XML/CSV feed; validate, normalize dimensions, and upsert catalog entries and embeddings.

Provider credentials must remain server-side. The browser demo has mock analysis and sample catalog data; it does not fetch live marketplace listings.
