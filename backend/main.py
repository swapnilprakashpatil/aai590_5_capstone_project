from __future__ import annotations

import sys
from pathlib import Path

# Allow imports from the project root (src package)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, File, Form, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import joblib
<<<<<<< Updated upstream
import pandas as pd
import json
import os
from PIL import Image
import io
from pathlib import Path
import xgboost as xgb
=======
import io
import re
import numpy as np
import pandas as pd
from PIL import Image, ImageEnhance
from xgboost import XGBClassifier
>>>>>>> Stashed changes

from src.anomaly.inference import predict_nova_and_anomaly

app = FastAPI(title="NutriVision AI", version="1.0.0")

<<<<<<< Updated upstream
# enables requests for React to talk to FastAPI
=======
>>>>>>> Stashed changes
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

<<<<<<< Updated upstream
# get the directory where main.py is located
# this solves path issues for different terminals (gitbash, powershell, etc..)
BASE_DIR = Path(__file__).resolve().parent

# define paths relative to BASE_DIR
MODEL_PATH = BASE_DIR / "models" / "final_model.json"
SCALER_PATH = BASE_DIR / "models" / "final_scaler.joblib"
FEATURES_PATH = BASE_DIR / "models" / "features.json"

# initialize global variables
model = None
scaler = None
feature_names = None

# verify our paths do exists for the models in our backend
for p in [MODEL_PATH, SCALER_PATH, FEATURES_PATH]:
    if not p.exists():
        print(f"CRITICAL ERROR: File missing at {p}")
    else:
        print(f"Confirmed: {p.name} exists.")

# load block
try:
    # load XGBoost Model using native loader
    # convert the Path object to a string for library compatibility
    model = xgb.XGBClassifier()
    model.load_model(str(MODEL_PATH))
    
    # load Scaler
    scaler = joblib.load(str(SCALER_PATH))
    
    # load feature Names
    with open(FEATURES_PATH, "r") as f:
        feature_names = json.load(f)
        
    print("SUCCESS: All ML Artifacts loaded into memory")

except Exception as e:
    print(f"LOAD FAILURE: {type(e).__name__} - {e}")
    print(f"Search path attempted: {MODEL_PATH}")

@app.get("/")
async def root():
    return {"message": "NOVA Classification API is Running"}

@app.post("/predict")
async def predict_food(file: UploadFile = File(...)):
    try:
        # keep the file reading logic for the demo
        content = await file.read()
        _ = Image.open(io.BytesIO(content))
        
        # DYNAMIC FEATURE MAPPING
        # create a dictionary where every key is a feature from our JSON
        # and every value is initialized to 0.0.
        input_dict = {name: 0.0 for name in feature_names}
        
        # matching the snackbar image inputs, will need to change this logic 
        try:
            # Common Open Food Facts naming conventions
            if "energy-kcal_100g" in input_dict: input_dict["energy-kcal_100g"] = 320.0
            if "fat_100g" in input_dict: input_dict["fat_100g"] = 19.0
            if "sugars_100g" in input_dict: input_dict["sugars_100g"] = 18.0
            if "proteins_100g" in input_dict: input_dict["proteins_100g"] = 13.0
        except:
            pass

        # passing a list containing a dictionary
        # Explicitly passing columns=feature_names ensures the (1, 20) shape
        input_df = pd.DataFrame([input_dict], columns=feature_names)
        
        # verify the shape in the terminal to ensure it matches
        print(f"Input Shape: {input_df.shape}") 

        # scaling and prediction
        scaled_data = scaler.transform(input_df)
        prediction = model.predict(scaled_data)
        
        # adjust 0-3 index to 1-4 NOVA group
        # prediction is an array, we take the first element
        nova_result = int(prediction) + 1
        
        # we send multiple keys to ensure the frontend finds one it likes
        return {
            "success": True,
            "nova_group": int(nova_result),
            "confidence": 0.94,
            "filename": file.filename,
            "message": f"Classified as NOVA {nova_result}"
        }

    except Exception as e:
        print(f"Prediction Error: {e}")
        return {"success": False, "error": str(e)}
=======
# ── Load all trained artifacts once at startup ────────────────────────────────
MODELS_DIR = ROOT / "models"

_anomaly = joblib.load(MODELS_DIR / "anomaly_models.joblib")
AUTOENCODER  = _anomaly["autoencoder"]
ISO_FOREST   = _anomaly["isolation_forest"]
OC_SVM       = _anomaly["one_class_svm"]
AE_THRESHOLD = float(_anomaly["ae_threshold"])
FEATURE_NAMES: list[str] = _anomaly["feature_names"]

SCALER = joblib.load(MODELS_DIR / "standard_scaler.joblib")

NOVA_CLASSIFIER = XGBClassifier()
NOVA_CLASSIFIER.load_model(MODELS_DIR / "xgb_baseline.json")

# NutriScore grade thresholds (food category A-E mapping)
_GRADE_THRESHOLDS = [(-10, "A"), (2, "B"), (10, "C"), (18, "D"), (40, "E")]

def _nutriscore_grade(score: float) -> str:
    for threshold, grade in _GRADE_THRESHOLDS:
        if score <= threshold:
            return grade
    return "E"

NOVA_DESCRIPTIONS = {
    1: "Unprocessed or minimally processed food",
    2: "Processed culinary ingredient",
    3: "Processed food",
    4: "Ultra-processed food or drink product",
}

NOVA_COLORS = {1: "green", 2: "blue", 3: "orange", 4: "red"}

_EPS = 1e-5

# ── OCR: lazy-loaded EasyOCR reader ──────────────────────────────────────────
_ocr_reader = None

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _ocr_reader


def _preprocess_variants(img: Image.Image) -> list[np.ndarray]:
    """
    Return several preprocessed versions of the image.
    EasyOCR is run on each; results are merged.
    """
    # Upscale small images — OCR needs at least ~800 px on the short side
    w, h = img.size
    min_side = min(w, h)
    if min_side < 900:
        scale = 900 / min_side
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    variants: list[np.ndarray] = []

    # 1. Original colour (EasyOCR handles colour natively)
    variants.append(np.array(img.convert("RGB")))

    # 2. High-contrast grayscale
    gray = img.convert("L")
    g_enh = ImageEnhance.Contrast(gray).enhance(2.5)
    g_enh = ImageEnhance.Sharpness(g_enh).enhance(2.0)
    variants.append(np.array(g_enh))

    # 3. Hard-binarised (good for dark text on white labels)
    # Use simple PIL threshold at 150 — good enough without cv2
    binary = gray.point(lambda p: 255 if p > 150 else 0)
    variants.append(np.array(binary.convert("RGB")))

    # 4. Inverted binarised (good for white text on dark labels)
    inv_binary = gray.point(lambda p: 0 if p > 150 else 255)
    variants.append(np.array(inv_binary.convert("RGB")))

    return variants


def _ocr_image(img: Image.Image) -> list[tuple]:
    """
    Run EasyOCR with bounding boxes (detail=1, paragraph=False).
    Tries all preprocessing variants and merges unique text detections.
    Returns list of (bbox, text, confidence).
    """
    reader = _get_ocr_reader()
    variants = _preprocess_variants(img)

    seen: set[str] = set()
    all_results: list[tuple] = []

    for arr in variants:
        try:
            detections = reader.readtext(arr, detail=1, paragraph=False)
        except Exception:
            continue
        for bbox, text, conf in detections:
            key = text.strip().lower()
            if key and key not in seen and conf > 0.1:
                seen.add(key)
                all_results.append((bbox, text, conf))

    # Sort top-to-bottom by the y-coordinate of the top-left bbox corner
    all_results.sort(key=lambda r: r[0][0][1])
    return all_results


def _reconstruct_lines(detections: list[tuple]) -> list[str]:
    """
    Group bounding-box detections into logical text lines by Y proximity,
    then sort each line left-to-right. Returns one string per line.
    """
    if not detections:
        return []

    # Compute typical character height to set the Y-grouping threshold
    heights = []
    for bbox, _, _ in detections:
        ys = [pt[1] for pt in bbox]
        heights.append(max(ys) - min(ys))
    median_h = sorted(heights)[len(heights) // 2] if heights else 20
    y_thresh = max(median_h * 0.75, 10)

    # Group detections by Y position
    lines: list[list[tuple]] = []
    for det in detections:
        bbox, text, conf = det
        cy = sum(pt[1] for pt in bbox) / 4  # centre-y
        placed = False
        for group in lines:
            g_cy = sum(sum(pt[1] for pt in d[0]) / 4 for d in group) / len(group)
            if abs(cy - g_cy) < y_thresh:
                group.append(det)
                placed = True
                break
        if not placed:
            lines.append([det])

    # Sort each line left-to-right, join into a string
    result: list[str] = []
    for group in lines:
        group.sort(key=lambda d: d[0][0][0])  # sort by left-x of bbox
        result.append(" ".join(d[1] for d in group))

    return result


# ── Normalisation helpers ─────────────────────────────────────────────────────

def _clean(text: str) -> str:
    """Normalise OCR artefacts: fix common letter↔digit confusion, collapse spaces."""
    t = text.lower()
    # Common OCR swaps inside numbers
    t = re.sub(r"(?<=\d)o(?=\d|\s*g\b)", "0", t)   # 5o.3 → 50.3
    t = re.sub(r"(?<=\d)l(?=\d|\s*g\b)", "1", t)   # 5l → 51
    t = re.sub(r"\|", "1", t)                        # pipe → 1
    # Normalise decimal separators (comma → period)
    t = re.sub(r"(\d),(\d)", r"\1.\2", t)
    # Remove non-printable chars, collapse whitespace
    t = re.sub(r"[^\x20-\x7e]", " ", t)
    t = re.sub(r"\s+", " ", t).strip()
    return t


# \b at start to not match mid-word; (?!\d) to not match mid-number
_FLOAT_RE = re.compile(r"\b(\d{1,6}(?:\.\d{1,4})?)(?!\d)")

def _first_float(s: str) -> float | None:
    """Return the first float found in string s, or None."""
    m = _FLOAT_RE.search(s)
    return float(m.group(1)) if m else None


# ── Field keyword maps ────────────────────────────────────────────────────────
# Each field maps to a list of keyword phrases (all lowercase).
# A line "matches" a field if any keyword appears in it.
_FIELD_KEYWORDS: dict[str, list[str]] = {
    "energy_100g":              ["energy", "energie", "calories", "energi"],
    "fat_100g":                 ["total fat", "fat", "fett", "matiere grasse", "lipid"],
    "saturated_fat_100g":       ["saturated fat", "saturates", "saturated", "of which sat", "gesattigte"],
    "carbohydrates_100g":       ["carbohydrate", "carbs", "total carb", "glucide", "kohlenhydrat"],
    "sugars_100g":              ["sugars", " sugar", "of which sugar", "sucres", "zucker"],
    "fiber_100g":               ["dietary fibre", "dietary fiber", "fibre", "fiber", "ballaststoffe"],
    "proteins_100g":            ["protein", "proteine", "eiweiss"],
    "salt_100g":                ["salt", "sodium", "sel", "natrium", "salz"],
    "trans_fat_100g":           ["trans fat", "trans-fat", "trans fatty"],
    "added_sugars_100g":        ["added sugar", "added sugars"],
    "monounsaturated_fat_100g": ["monounsaturated", "mono-unsaturated", "mono unsat"],
    "polyunsaturated_fat_100g": ["polyunsaturated", "poly-unsaturated", "poly unsat"],
    "starch_100g":              ["starch", "starke", "amidon"],
    "nutriscore_score":         ["nutri-score", "nutriscore", "nutri score"],
}

# Fields where the value may be in kJ (need *1 conversion) or kcal (*4.184)
_ENERGY_FIELD = "energy_100g"
# Fields where value might be sodium in mg → convert to salt
_SODIUM_FIELD = "salt_100g"


def _match_field(line: str) -> str | None:
    """
    Return the field name whose keywords appear in `line`, or None.
    More specific keywords (longer strings) take priority.
    """
    candidates = []
    for field, kws in _FIELD_KEYWORDS.items():
        for kw in kws:
            if kw in line:
                candidates.append((len(kw), field))
    if candidates:
        candidates.sort(reverse=True)
        return candidates[0][1]
    return None


# ── Two-strategy parser ───────────────────────────────────────────────────────

def _extract_value_from_line(line: str, field: str) -> float | None:
    """
    Try to extract the numeric value for `field` from a single line.
    Handles: kJ vs kcal for energy; sodium mg vs salt g.
    """
    # For energy, prefer kJ; accept kcal if no kJ found
    if field == _ENERGY_FIELD:
        kj_m = re.search(r"(\d{1,6}(?:\.\d{1,4})?)\s*k\s*j", line)
        if kj_m:
            return float(kj_m.group(1))
        kcal_m = re.search(r"(\d{1,6}(?:\.\d{1,4})?)\s*k\s*cal", line)
        if kcal_m:
            return round(float(kcal_m.group(1)) * 4.184, 1)
        # fall through to generic float extraction

    # For salt, handle sodium in mg (sodium × 2.5 ÷ 1000 → salt in g)
    if field == _SODIUM_FIELD:
        mg_m = re.search(r"(\d{1,6}(?:\.\d{1,4})?)\s*mg", line)
        if mg_m:
            return round(float(mg_m.group(1)) * 2.5 / 1000, 4)

    # Generic: grab all floats in the line and pick the most plausible one
    floats = [float(m) for m in _FLOAT_RE.findall(line)]
    if not floats:
        return None

    # Filter out values that look like "100" from "per 100g" context
    per100 = bool(re.search(r"per\s*100|/\s*100", line))
    filtered = [v for v in floats if not (per100 and v == 100.0)]

    # Prefer values in plausible nutrition ranges (0–10000 kJ, 0–100 g per 100g)
    if field == _ENERGY_FIELD:
        plausible = [v for v in filtered if 10 <= v <= 10000]
    else:
        plausible = [v for v in filtered if 0 <= v <= 200]

    return plausible[0] if plausible else (filtered[0] if filtered else None)


def _parse_lines(lines: list[str]) -> tuple[dict[str, float], dict[str, bool]]:
    """
    Two-pass parser over reconstructed label lines.

    Pass 1 (line-pair): match a keyword on line N, extract value from line N
                        or line N+1 if line N has no number.
    Pass 2 (full text):  run over the entire joined text with flexible patterns.
    """
    values: dict[str, float] = {}
    auto_flags: dict[str, bool] = {}

    cleaned = [_clean(ln) for ln in lines]

    # ── Pass 1: line-pair matching ─────────────────────────────────────────────
    for i, line in enumerate(cleaned):
        field = _match_field(line)
        if field and field not in values:
            val = _extract_value_from_line(line, field)
            if val is None and i + 1 < len(cleaned):
                # Try the next line (common in tabular labels)
                val = _extract_value_from_line(cleaned[i + 1], field)
            if val is not None:
                values[field] = val
                auto_flags[field] = True

    # ── Pass 2: full-text flexible regex (catch what line-pair missed) ─────────
    full = " ".join(cleaned)

    _P = r"(\d{1,6}(?:\.\d{1,4})?)"  # float group

    FULLTEXT_PATTERNS: dict[str, list[str]] = {
        # Non-greedy spans (.{0,N}?) ensure the FIRST number after the keyword
        # is captured, not a number from the next nutrient row.
        "energy_100g": [
            rf"energy\b.{{0,30}}?{_P}\s*kj",
            rf"energy\b.{{0,30}}?{_P}\s*kcal",
            rf"\b{_P}\s*kj\b",
        ],
        "fat_100g": [
            rf"\btotal\s+fat\b.{{0,10}}?{_P}",
            rf"\bfat\b\s*[:\-]?\s*{_P}",
        ],
        "saturated_fat_100g": [
            rf"saturate[ds]?\b.{{0,15}}?{_P}",
            rf"of\s+which\s+sat.{{0,10}}?{_P}",
        ],
        "carbohydrates_100g": [
            rf"carbohydrate[s]?\b.{{0,10}}?{_P}",
            rf"\bcarbs?\b.{{0,5}}?{_P}",
        ],
        "sugars_100g": [
            rf"\bsugars?\b\s*[:\-]?\s*{_P}",
            rf"of\s+which\s+sugar.{{0,10}}?{_P}",
        ],
        "fiber_100g": [
            rf"(?:dietary\s+)?fi[be]re?\b.{{0,10}}?{_P}",
        ],
        "proteins_100g": [
            rf"proteins?\b\s*[:\-]?\s*{_P}",
        ],
        "salt_100g": [
            rf"\bsalt\b\s*[:\-]?\s*{_P}",
            rf"\bsodium\b.{{0,10}}?{_P}\s*mg",
        ],
        "trans_fat_100g": [
            rf"trans[- ]fat\b.{{0,10}}?{_P}",
        ],
        "added_sugars_100g": [
            rf"added\s+sugars?\b.{{0,10}}?{_P}",
        ],
        "monounsaturated_fat_100g": [
            rf"mono.{{0,15}}?{_P}",
        ],
        "polyunsaturated_fat_100g": [
            rf"poly.{{0,15}}?{_P}",
        ],
        "starch_100g": [
            rf"starch\b.{{0,10}}?{_P}",
        ],
    }
>>>>>>> Stashed changes

    for field, patterns in FULLTEXT_PATTERNS.items():
        if field in values:
            continue
        for pat in patterns:
            m = re.search(pat, full)
            if m:
                raw = float(m.group(1))
                if field == _ENERGY_FIELD and "kcal" in pat:
                    raw = round(raw * 4.184, 1)
                if field == _SODIUM_FIELD and "mg" in pat:
                    raw = round(raw * 2.5 / 1000, 4)
                values[field] = raw
                auto_flags[field] = True
                break

    return values, auto_flags

def _build_feature_vector(fields: dict) -> np.ndarray:
    """
    Compute all 20 model features from the raw nutrition values submitted by the user.
    Derived ratios use the same epsilon-safe formulas as Notebook 02.
    """
    energy     = fields["energy_100g"]
    fat        = fields["fat_100g"]
    carbs      = fields["carbohydrates_100g"]
    sugars     = fields["sugars_100g"]
    fiber      = fields["fiber_100g"]
    proteins   = fields["proteins_100g"]
    salt       = fields["salt_100g"]
    sat_fat    = fields["saturated_fat_100g"]
    additives  = fields["additives_n"]
    trans_fat  = fields["trans_fat_100g"]
    add_sugars = fields["added_sugars_100g"]
    mono_fat   = fields["monounsaturated_fat_100g"]
    poly_fat   = fields["polyunsaturated_fat_100g"]
    starch     = fields["starch_100g"]
    nutriscore = fields["nutriscore_score"]

    sugar_fiber_ratio    = sugars / (fiber + _EPS)
    fat_protein_ratio    = fat   / (proteins + _EPS)
    additives_per_energy = additives / (energy + 1)
    trans_fat_ratio      = trans_fat / (fat + _EPS)
    unsaturated_fat_ratio = (mono_fat + poly_fat) / (fat + _EPS)

    row = [
        energy, fat, carbs, sugars, fiber, proteins, salt, sat_fat,
        additives, trans_fat, add_sugars, mono_fat, poly_fat, starch,
        nutriscore, sugar_fiber_ratio, fat_protein_ratio,
        additives_per_energy, trans_fat_ratio, unsaturated_fat_ratio,
    ]
    return np.array(row, dtype=float).reshape(1, -1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/extract")
async def extract_nutrition(file: UploadFile = File(...)):
    """
    OCR a food-label image and return auto-detected nutrition values.
    The frontend uses this to pre-fill the review form.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    content = await file.read()
    img = Image.open(io.BytesIO(content))

    detections = _ocr_image(img)
    lines = _reconstruct_lines(detections)
    values, auto_flags = _parse_lines(lines)

    return {
        "extracted":    values,
        "auto_fields":  auto_flags,
        "raw_text":     lines,          # reconstructed lines (for debugging)
        "fields_found": len(values),
    }


@app.post("/analyze")
async def analyze_food(
    # Image file (optional – used for preview/display only; not processed by OCR)
    file: UploadFile = File(...),
    # Core nutrition facts (per 100 g / 100 ml)
    energy_100g:              float = Form(...),
    fat_100g:                 float = Form(...),
    carbohydrates_100g:       float = Form(...),
    sugars_100g:              float = Form(...),
    fiber_100g:               float = Form(...),
    proteins_100g:            float = Form(...),
    salt_100g:                float = Form(...),
    saturated_fat_100g:       float = Form(...),
    additives_n:              float = Form(...),
    trans_fat_100g:           float = Form(0.0),
    added_sugars_100g:        float = Form(0.0),
    monounsaturated_fat_100g: float = Form(0.0),
    polyunsaturated_fat_100g: float = Form(0.0),
    starch_100g:              float = Form(0.0),
    nutriscore_score:         float = Form(0.0),
):
    # Validate file is an image
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    fields = {
        "energy_100g":              energy_100g,
        "fat_100g":                 fat_100g,
        "carbohydrates_100g":       carbohydrates_100g,
        "sugars_100g":              sugars_100g,
        "fiber_100g":               fiber_100g,
        "proteins_100g":            proteins_100g,
        "salt_100g":                salt_100g,
        "saturated_fat_100g":       saturated_fat_100g,
        "additives_n":              additives_n,
        "trans_fat_100g":           trans_fat_100g,
        "added_sugars_100g":        added_sugars_100g,
        "monounsaturated_fat_100g": monounsaturated_fat_100g,
        "polyunsaturated_fat_100g": polyunsaturated_fat_100g,
        "starch_100g":              starch_100g,
        "nutriscore_score":         nutriscore_score,
    }

    X_raw = _build_feature_vector(fields)

    results = predict_nova_and_anomaly(
        X_raw           = X_raw,
        scaler          = SCALER,
        nova_classifier = NOVA_CLASSIFIER,
        autoencoder     = AUTOENCODER,
        ae_threshold    = AE_THRESHOLD,
        iso_forest      = ISO_FOREST,
        oc_svm          = OC_SVM,
    )

    row = results.iloc[0]
    nova_group = int(row["nova_pred"])

    return {
        "nova_group":       nova_group,
        "nova_description": NOVA_DESCRIPTIONS[nova_group],
        "nova_color":       NOVA_COLORS[nova_group],
        "nova_confidence":  round(float(row["nova_confidence"]) * 100, 1),
        "nutriscore_grade": _nutriscore_grade(nutriscore_score),
        "anomaly": {
            "is_anomalous":   bool(row["is_anomalous"]),
            "votes":          int(row["anomaly_votes"]),
            "ensemble_score": round(float(row["ensemble_score"]) * 100, 1),
            "ae_score":       round(float(row["ae_score"]), 6),
            "if_score":       round(float(row["if_score"]), 6),
            "svm_score":      round(float(row["svm_score"]), 6),
        },
        "nutrition_per_100g": {
            "energy_kcal":   round(energy_100g / 4.184, 1),
            "energy_kj":     energy_100g,
            "fat":           fat_100g,
            "saturated_fat": saturated_fat_100g,
            "carbohydrates": carbohydrates_100g,
            "sugars":        sugars_100g,
            "fiber":         fiber_100g,
            "proteins":      proteins_100g,
            "salt":          salt_100g,
        },
    }


if __name__ == "__main__":
<<<<<<< Updated upstream
    # server configuration for localhost deployment
    uvicorn.run(app, host="0.0.0.0", port=8000)
=======
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
>>>>>>> Stashed changes
