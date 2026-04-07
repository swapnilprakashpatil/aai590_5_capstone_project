from __future__ import annotations

import os
import sys
from pathlib import Path
import logging
import traceback
import asyncio
from typing import Dict, Any, Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv(Path(__file__).parent / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Allow imports from the project root (src package)
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from fastapi import FastAPI, File, Form, UploadFile, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import joblib
import io
import re
import numpy as np
import pandas as pd
from PIL import Image, ImageEnhance
from xgboost import XGBClassifier
from pydantic import BaseModel

from src.anomaly.inference import predict_nova_and_anomaly
from backend.agents import HealthInsightsOrchestrator

app = FastAPI(title="NutriVision AI", version="1.0.0")

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}")
    logger.error(traceback.format_exc())
    return JSONResponse(
        status_code=500,
        content={"detail": f"Internal server error: {str(exc)}"}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load all trained artifacts once at startup
BACKEND_MODELS_DIR = ROOT / "backend" / "models"

# Load anomaly detection models from backend/models (exported from notebook 05)
_anomaly = joblib.load(BACKEND_MODELS_DIR / "anomaly_models.joblib")
AUTOENCODER  = _anomaly["autoencoder"]
ISO_FOREST   = _anomaly["isolation_forest"]
OC_SVM       = _anomaly["one_class_svm"]
AE_THRESHOLD = float(_anomaly["ae_threshold"])
FEATURE_NAMES: list[str] = _anomaly["feature_names"]

# Load the final scaler from backend/models (exported from notebook 04)
SCALER = joblib.load(BACKEND_MODELS_DIR / "final_scaler.joblib")

# Load the tuned XGBoost model from backend/models (exported from notebook 04)
NOVA_CLASSIFIER = XGBClassifier()
NOVA_CLASSIFIER.load_model(BACKEND_MODELS_DIR / "xgb_tuned.json")

# Initialize Health Insights Orchestrator (lazy-loaded)
_health_orchestrator = None

def _get_health_orchestrator() -> HealthInsightsOrchestrator:
    global _health_orchestrator
    if _health_orchestrator is None:
        _health_orchestrator = HealthInsightsOrchestrator()
    return _health_orchestrator

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

# OCR: lazy-loaded EasyOCR reader
_ocr_reader = None
_ocr_cache: dict[str, dict] = {}  # Cache OCR results by image hash

# Pre-defined nutrition data for sample images (for instant demo responses)
SAMPLE_NUTRITION_DATA = {
    "1.webp": {  # Doritos Nacho Cheese
        "energy_100g": "2100", "fat_100g": "28.6", "saturated_fat_100g": "4.3",
        "carbohydrates_100g": "60.7", "sugars_100g": "3.6", "fiber_100g": "3.6",
        "proteins_100g": "7.1", "salt_100g": "1.4", "additives_n": "5"
    },
    "2.webp": {  # Coca Cola
        "energy_100g": "180", "fat_100g": "0", "saturated_fat_100g": "0",
        "carbohydrates_100g": "10.6", "sugars_100g": "10.6", "fiber_100g": "0",
        "proteins_100g": "0", "salt_100g": "0.01", "additives_n": "3"
    },
    "3.webp": {  # Perdue Chicken Breast
        "energy_100g": "465", "fat_100g": "1.8", "saturated_fat_100g": "0.5",
        "carbohydrates_100g": "0", "sugars_100g": "0", "fiber_100g": "0",
        "proteins_100g": "22.3", "salt_100g": "0.3", "additives_n": "0"
    },
    "4.webp": {  # Maruchan Ramen
        "energy_100g": "1560", "fat_100g": "16.0", "saturated_fat_100g": "8.0",
        "carbohydrates_100g": "52.0", "sugars_100g": "4.0", "fiber_100g": "2.0",
        "proteins_100g": "8.0", "salt_100g": "4.5", "additives_n": "8"
    },
    "5.webp": {  # Barley
        "energy_100g": "1475", "fat_100g": "2.3", "saturated_fat_100g": "0.5",
        "carbohydrates_100g": "73.5", "sugars_100g": "0.8", "fiber_100g": "17.3",
        "proteins_100g": "12.5", "salt_100g": "0.01", "additives_n": "0"
    },
    "6.webp": {  # Fischers Honey
        "energy_100g": "1340", "fat_100g": "0", "saturated_fat_100g": "0",
        "carbohydrates_100g": "82.0", "sugars_100g": "82.0", "fiber_100g": "0.2",
        "proteins_100g": "0.3", "salt_100g": "0.01", "additives_n": "0"
    },
    "7.webp": {  # Great Value Whole Milk
        "energy_100g": "260", "fat_100g": "3.3", "saturated_fat_100g": "2.1",
        "carbohydrates_100g": "5.0", "sugars_100g": "5.0", "fiber_100g": "0",
        "proteins_100g": "3.4", "salt_100g": "0.05", "additives_n": "1"
    },
    "8.webp": {  # Heinz Ketchup
        "energy_100g": "420", "fat_100g": "0.1", "saturated_fat_100g": "0",
        "carbohydrates_100g": "24.2", "sugars_100g": "22.8", "fiber_100g": "0.3",
        "proteins_100g": "1.0", "salt_100g": "1.1", "additives_n": "2"
    },
    "9.webp": {  # Lakewood Orange Juice
        "energy_100g": "188", "fat_100g": "0", "saturated_fat_100g": "0",
        "carbohydrates_100g": "10.4", "sugars_100g": "8.3", "fiber_100g": "0.2",
        "proteins_100g": "0.7", "salt_100g": "0.01", "additives_n": "0"
    },
    "10.webp": {  # Turkey Hill Ice Cream
        "energy_100g": "920", "fat_100g": "10.7", "saturated_fat_100g": "6.7",
        "carbohydrates_100g": "23.3", "sugars_100g": "20.0", "fiber_100g": "0.7",
        "proteins_100g": "3.3", "salt_100g": "0.1", "additives_n": "6"
    },
    "11.webp": {  # Velveeta Cheese Slices
        "energy_100g": "1255", "fat_100g": "21.4", "saturated_fat_100g": "14.3",
        "carbohydrates_100g": "14.3", "sugars_100g": "14.3", "fiber_100g": "0",
        "proteins_100g": "14.3", "salt_100g": "3.2", "additives_n": "7"
    },
    "12.webp": {  # Great Value Sweet Peas
        "energy_100g": "315", "fat_100g": "0.4", "saturated_fat_100g": "0.1",
        "carbohydrates_100g": "11.8", "sugars_100g": "3.9", "fiber_100g": "4.3",
        "proteins_100g": "5.1", "salt_100g": "0.24", "additives_n": "0"
    },
}

def _get_ocr_reader():
    global _ocr_reader
    if _ocr_reader is None:
        import easyocr
        _ocr_reader = easyocr.Reader(["en"], gpu=False, verbose=False)
    return _ocr_reader

def _get_image_hash(img: Image.Image) -> str:
    """Generate a simple hash of the image for caching."""
    import hashlib
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    return hashlib.md5(img_bytes.getvalue()).hexdigest()


def _preprocess_variants(img: Image.Image) -> list[np.ndarray]:
    """
    Return preprocessed versions of the image.
    EasyOCR is run on each; results are merged.
    Optimized to use fewer variants for speed.
    """
    # Upscale small images — OCR needs at least ~800 px on the short side
    w, h = img.size
    min_side = min(w, h)
    if min_side < 900:
        scale = 900 / min_side
        img = img.resize((int(w * scale), int(h * scale)), Image.LANCZOS)

    variants: list[np.ndarray] = []

    # 1. Original colour (EasyOCR handles colour natively) - works well for most labels
    variants.append(np.array(img.convert("RGB")))

    # 2. High-contrast grayscale - helps with faded or low-contrast labels
    gray = img.convert("L")
    g_enh = ImageEnhance.Contrast(gray).enhance(2.5)
    g_enh = ImageEnhance.Sharpness(g_enh).enhance(2.0)
    variants.append(np.array(g_enh))

    # Reduced from 4 to 2 variants for faster processing
    # Binary variants are only needed for very poor quality images

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


# Normalisation helpers

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


# Field keyword maps
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


# Two-strategy parser

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

    # Pass 1: line-pair matching
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

    # Pass 2: full-text flexible regex (catch what line-pair missed)
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
    Compute all 13 model features from the raw nutrition values submitted by the user.
    Derived ratios use the same epsilon-safe formulas as Notebook 02.
    
    Features match the training data (feature_names.json):
    - 10 raw nutritional values (excluding nutriscore_score)
    - 3 derived ratios (excluding saturated_fat_ratio)
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
    add_sugars = fields["added_sugars_100g"]
    # nutriscore is NOT part of the model features (excluded)

    # Derived features (3 ratios)
    sugar_fiber_ratio    = sugars / (fiber + _EPS)
    fat_protein_ratio    = fat / (proteins + _EPS)
    additives_per_energy = additives / (energy + 1)
    # saturated_fat_ratio is NOT part of the model features (excluded)

    # Feature order must match feature_names.json exactly (13 features)
    row = [
        energy, fat, carbs, sugars, fiber, proteins, salt, sat_fat,
        additives, add_sugars,
        sugar_fiber_ratio, fat_protein_ratio, additives_per_energy,
    ]
    return np.array(row, dtype=float).reshape(1, -1)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/health/ai")
async def health_ai():
    """
    Check Azure OpenAI model health with a minimal test request
    """
    try:
        orchestrator = _get_health_orchestrator()
        
        # Test with more tokens to see if model returns content
        test_response = await orchestrator.client.chat.completions.create(
            model=orchestrator.deployment,
            messages=[
                {"role": "user", "content": "Reply with OK"}
            ],
            max_completion_tokens=100
        )
        
        response_text = test_response.choices[0].message.content
        logger.info(f"AI health check - Raw response: '{response_text}'")
        logger.info(f"AI health check - Finish reason: {test_response.choices[0].finish_reason}")
        logger.info(f"AI health check - Tokens: prompt={test_response.usage.prompt_tokens}, completion={test_response.usage.completion_tokens}")
        
        if response_text:
            response_text = response_text.strip()
        else:
            response_text = ""
        
        return {
            "status": "ok",
            "model": orchestrator.deployment,
            "response": response_text,
            "tokens_used": test_response.usage.total_tokens,
            "finish_reason": test_response.choices[0].finish_reason,
            "prompt_tokens": test_response.usage.prompt_tokens,
            "completion_tokens": test_response.usage.completion_tokens
        }
    except Exception as e:
        logger.error(f"AI health check failed: {e}")
        logger.error(traceback.format_exc())
        return {
            "status": "error",
            "error": str(e),
            "model": os.getenv("AZURE_OPENAI_ROUTER_DEPLOYMENT_NAME", "unknown")
        }


@app.post("/extract")
async def extract_nutrition(file: UploadFile = File(...)):
    """
    OCR a food-label image and return auto-detected nutrition values.
    The frontend uses this to pre-fill the review form.
    For demo sample images, returns pre-defined data instantly.
    For custom uploads, uses OCR with caching.
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image.")

    # Check if this is a sample image (instant response for demo)
    if file.filename and file.filename in SAMPLE_NUTRITION_DATA:
        logger.info(f"Sample image detected: {file.filename} - returning pre-defined data")
        sample_data = SAMPLE_NUTRITION_DATA[file.filename]
        auto_flags = {k: True for k in sample_data.keys()}
        return {
            "extracted": sample_data,
            "auto_fields": auto_flags,
            "raw_text": [f"Sample nutrition data for {file.filename}"],
            "fields_found": len(sample_data),
        }

    content = await file.read()
    img = Image.open(io.BytesIO(content))
    
    # Check cache for custom uploads
    img_hash = _get_image_hash(img)
    if img_hash in _ocr_cache:
        logger.info(f"OCR cache hit for image hash {img_hash[:8]}")
        return _ocr_cache[img_hash]

    logger.info(f"OCR processing custom image - hash {img_hash[:8]}")
    detections = _ocr_image(img)
    lines = _reconstruct_lines(detections)
    values, auto_flags = _parse_lines(lines)

    result = {
        "extracted":    values,
        "auto_fields":  auto_flags,
        "raw_text":     lines,          # reconstructed lines (for debugging)
        "fields_found": len(values),
    }
    
    # Cache the result
    _ocr_cache[img_hash] = result
    logger.info(f"OCR cache stored for image hash {img_hash[:8]}")
    
    return result


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
    try:
        logger.info(f"Received analyze request for file: {file.filename}")
        
        # Validate file is an image
        if not file.content_type.startswith("image/"):
            logger.warning(f"Invalid content type: {file.content_type}")
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
        
        logger.debug(f"Processing nutrition fields: {fields}")

        X_raw = _build_feature_vector(fields)
        logger.debug(f"Feature vector shape: {X_raw.shape}")

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
        
        logger.info(f"Analysis complete: NOVA group {nova_group}, anomaly={bool(row['is_anomalous'])}")

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
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in analyze_food: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# Pydantic models for request/response
class UserProfile(BaseModel):
    age: int = 30
    weight: float = 70.0
    height: float = 170.0
    activity_level: str = "moderate"
    health_conditions: list[str] = []
    dietary_restrictions: list[str] = []
    allergies: list[str] = []
    goals: list[str] = []
    family_history: list[str] = []


class HealthInsightsRequest(BaseModel):
    product_data: Dict[str, Any]
    user_profile: UserProfile
    use_mock_data: bool = False


@app.post("/health-insights")
async def generate_health_insights(request: HealthInsightsRequest = Body(...)):
    """
    Generate comprehensive health insights using multi-agent RAG framework.
    
    Args:
        request: Contains product_data (nutrition, NOVA, anomalies) and user_profile
    
    Returns:
        Insights from all health agents plus technical analysis
    """
    try:
        logger.info("Generating health insights...")
        
        orchestrator = _get_health_orchestrator()
        
        # Generate insights using the agentic RAG framework
        insights = await orchestrator.generate_insights(
            product_data=request.product_data,
            user_profile=request.user_profile.dict()
        )
        
        logger.info(f"Health insights generated in {insights['metadata']['total_duration_seconds']:.2f}s")
        
        return insights
    
    except Exception as e:
        logger.error(f"Error generating health insights: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Failed to generate insights: {str(e)}")


@app.post("/analyze-with-insights")
async def analyze_with_health_insights(
    file: UploadFile = File(...),
    user_profile: str = Form(...),  # JSON string of UserProfile
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
    """
    Complete pipeline: Analyze nutrition + NOVA + anomalies + Generate health insights
    
    This is a convenience endpoint that combines /analyze and /health-insights
    """
    try:
        import json
        user_profile_dict = json.loads(user_profile)
        
        # First, run the analysis
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
        
        analysis_result = {
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
                "additives":     int(additives_n),
            },
        }
        
        # Generate health insights
        orchestrator = _get_health_orchestrator()
        
        product_data = {
            "product_name": file.filename,
            "nova_class": nova_group,
            "nutrition": analysis_result["nutrition_per_100g"],
            "anomalies": analysis_result["anomaly"]
        }
        
        insights = await orchestrator.generate_insights(
            product_data=product_data,
            user_profile=user_profile_dict
        )
        
        return {
            "analysis": analysis_result,
            "health_insights": insights
        }
    
    except Exception as e:
        logger.error(f"Error in analyze_with_health_insights: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.post("/test/mock-insights")
async def test_mock_insights(user_profile: Optional[UserProfile] = None):
    """
    Test endpoint with mocked product data to test the agentic AI framework.
    
    This generates insights for a sample ultra-processed snack product.
    """
    try:
        # Mock product data - ultra-processed snack (NOVA 4)
        mock_product = {
            "product_name": "Sample Cheese Flavored Snack",
            "nova_class": 4,
            "nutrition": {
                "energy_kcal": 536,
                "energy_kj": 2245,
                "fat": 33.0,
                "saturated_fat": 10.0,
                "carbohydrates": 53.0,
                "sugars": 2.5,
                "fiber": 1.5,
                "proteins": 6.5,
                "salt": 1.8,
                "additives": 8,
            },
            "anomalies": {
                "is_anomalous": True,
                "votes": 2,
                "ensemble_score": 66.7,
                "ae_score": 0.1523,
                "if_score": -0.0872,
                "svm_score": 0.3456,
            }
        }
        
        # Default user profile if not provided
        if user_profile is None:
            user_profile = UserProfile(
                age=35,
                weight=75.0,
                height=175.0,
                activity_level="moderate",
                health_conditions=["high blood pressure", "pre-diabetes"],
                dietary_restrictions=["trying to reduce sodium", "low sugar diet"],
                allergies=["peanuts"],
                goals=["weight loss", "heart health", "better energy"],
                family_history=["type 2 diabetes", "heart disease"]
            )
        
        logger.info("Generating mock health insights for testing...")
        
        orchestrator = _get_health_orchestrator()
        insights = await orchestrator.generate_insights(
            product_data=mock_product,
            user_profile=user_profile.dict()
        )
        
        return {
            "mock_product": mock_product,
            "user_profile": user_profile.dict(),
            "health_insights": insights,
            "note": "This is test data with mocked product information"
        }
    
    except Exception as e:
        logger.error(f"Error in test_mock_insights: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Mock insights failed: {str(e)}")


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
