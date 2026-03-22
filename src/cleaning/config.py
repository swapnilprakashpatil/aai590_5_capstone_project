"""Constants for the data-cleaning and feature-engineering pipeline."""

from pathlib import Path

from src.eda.config import (
    BASE_NUTRIENT_COLS,
    DEFAULT_LIGHT_DATASET_PATH,
    GRADE_ORDER,
    META_COLS,
    NOVA_ORDER,
)

# ── Paths ────────────────────────────────────────────────────────────────────
CLEANED_DATASET_PATH = Path("dataset") / "cleaned.csv"

# ── Target ───────────────────────────────────────────────────────────────────
TARGET_COL = "nova_group"

# ── Columns to drop (redundant / leaky) ──────────────────────────────────────
REDUNDANT_COLS = ["sodium_100g"]

# ── Nutrient cols used after cleaning (sodium removed) ───────────────────────
NUTRIENT_COLS_CLEAN = [c for c in BASE_NUTRIENT_COLS if c not in REDUNDANT_COLS]

# ── Engineered nutrient-ratio features ───────────────────────────────────────
RATIO_FEATURES = [
    "sugar_to_carb_ratio",
    "sat_fat_to_fat_ratio",
    "fat_energy_pct",
    "protein_energy_pct",
    "fiber_to_carb_ratio",
    "salt_per_energy",
]

# ── Additive engineering ─────────────────────────────────────────────────────
TOP_ADDITIVE_COUNT = 15

# ── Columns kept for modelling (set dynamically in the notebook) ─────────────
ID_COLS = ["code", "product_name", "brands"]

TEXT_COLS = ["ingredients_text", "additives_tags", "categories_en"]

CATEGORY_ENCODE_COLS = ["pnns_groups_1"]

# ── Feature-selection thresholds ─────────────────────────────────────────────
HIGH_CORR_THRESHOLD = 0.90
LOW_VARIANCE_THRESHOLD = 0.01

# ── Train-test split ────────────────────────────────────────────────────────
TEST_SIZE = 0.20
RANDOM_STATE = 42
