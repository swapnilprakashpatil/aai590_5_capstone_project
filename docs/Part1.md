1. Offline phase: Train and package the model

Build your training dataset from Open Food Facts with the exact feature schema you want at inference time.
Apply the same preprocessing you used in notebooks:
Missing-value strategy.
Unit consistency (per 100g).
Outlier handling.
Train your classifier (for example, XGBoost / sklearn pipeline) to predict NOVA class 1-4.
Export one deployable artifact (for example, a joblib pipeline) that includes preprocessing + model together.
Save model metadata with it:
Feature list and order.
Training date/version.
Metrics (macro-F1, per-class recall, confusion matrix). 2. Online phase: Request flow (runtime orchestration)

User uploads an image from the UI.
Frontend sends multipart request to inference API endpoint.
Backend orchestration pipeline runs:
Validate file type/size.
OCR the label text.
Parse nutrient values (energy, fat, saturated fat, carbs, sugars, fiber, protein, salt/sodium, additives if available).
Normalize units to model format (especially mg to g, kCal/kJ consistency).
Build feature vector in strict model column order.
Run model inference.
Backend returns JSON:
Predicted NOVA tier.
Confidence score.
Extracted features used for prediction.
Metadata (model version, OCR confidence/notes, source). 3. Frontend behavior

Show card status transitions: pending -> analyzing -> complete/failed.
On success:
Display predicted NOVA tier and confidence.
Optionally show “why” fields (top extracted features).
On failure:
Show actionable message:
“Could not read nutrition table clearly.”
“Retake photo with better lighting.”
Aggregate stats across scanned items (average tier, high-risk count, completion ratio). 4. API contract (recommended)

POST /predict/label
Input: image file
Output: prediction + extracted features + metadata
POST /predict/features
Input: pre-extracted numeric JSON
Output: prediction + confidence
Purpose: easy testing and batch integrations
GET /health
Purpose: readiness/liveness checks 5. Fallback strategy

If trained model artifact is unavailable, use a clearly labeled heuristic scorer so UI flow still works.
Always include score_source in response:
trained_model
fallback_heuristic
This prevents silent quality degradation and helps demos continue. 6. Production concerns you should include

OCR quality controls:
Minimum image resolution.
Deskew/crop preprocessing.
Validation guardrails:
Reject impossible values.
Clamp extreme values to safe ranges.
Observability:
Log request ID, latency, OCR parse success rate, model version, error type.
Security:
File size limits.
MIME checks.
Optional auth/rate limiting.
Drift monitoring:
Track distribution shift in incoming nutrients.
Periodic retraining schedule. 7. Practical operating sequence for your team

Start backend inference API.
Start frontend.
Upload label image.
Inspect returned extracted features to verify OCR parsing quality.
Compare prediction against known products to sanity-check.
Iterate:
Improve OCR parser patterns.
Improve model.
Improve confidence calibration.

git clone --branch cleaning https://github.com/swapnilprakashpatil/aai590_5_capstone_project

mkdir -p dataset \
&& curl -L "https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz" \
| gunzip -c > dataset/en.openfoodfacts.org.products.tsv

import importlib, src.eda.data, src.eda.config, src.eda.analysis, src.cleaning.pipeline, src.cleaning.features, src.cleaning.config

for m in [src.eda.config, src.eda.data, src.eda.analysis, src.cleaning.config, src.cleaning.pipeline, src.cleaning.features]:
importlib.reload(m)
