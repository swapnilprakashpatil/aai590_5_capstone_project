import os
from pathlib import Path
import pandas as pd

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
DATASET_DIR = REPO_ROOT / "dataset"

INPUT_CANDIDATES = [
    DATASET_DIR / "en.openfoodfacts.org.products.csv"
]

INPUT_PATH = next((p for p in INPUT_CANDIDATES if p.exists()), INPUT_CANDIDATES[0])
OUTPUT_PATH = DATASET_DIR / "light.csv"
CHUNK_SIZE = 100_000

META_COLS = [
    "code",
    "product_name",
    "brands",
    "categories_en",
    "countries_en",
    "pnns_groups_1",
    "pnns_groups_2",
    "nutrition_grade_fr",
    "nova_group",
    "additives_n",
    "additives_tags",
    "ingredients_text",
    "ingredients_from_palm_oil_n",
    "ingredients_that_may_be_from_palm_oil_n",
]

BASE_NUTRIENT_COLS = [
    "energy_100g",
    "fat_100g",
    "saturated-fat_100g",
    "trans-fat_100g",
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
]

ALL_COLS = META_COLS + BASE_NUTRIENT_COLS


# Ensure output directory exists even if script is run from a different cwd.
DATASET_DIR.mkdir(parents=True, exist_ok=True)

with open(INPUT_PATH, "r", encoding="utf-8", errors="ignore") as fh:
    header_line = fh.readline()

sep = "\t" if header_line.count("\t") > header_line.count(",") else ","

rows_written = 0
header_written = False

for chunk in pd.read_csv(
    str(INPUT_PATH),
    sep=sep,
    low_memory=False,
    usecols=lambda c: c in ALL_COLS or c == "nutriscore_grade",
    on_bad_lines="skip",
    chunksize=CHUNK_SIZE,
):
    if "nutrition_grade_fr" not in chunk.columns and "nutriscore_grade" in chunk.columns:
        chunk = chunk.rename(columns={"nutriscore_grade": "nutrition_grade_fr"})

    # Keep rows that contain at least one nutrient value.
    nutrient_cols = [c for c in BASE_NUTRIENT_COLS if c in chunk.columns]
    if nutrient_cols:
        chunk = chunk[chunk[nutrient_cols].notna().any(axis=1)].copy()

    output_cols = [c for c in ALL_COLS if c in chunk.columns]
    chunk = chunk[output_cols]

    chunk.to_csv(
        str(OUTPUT_PATH),
        mode="w" if not header_written else "a",
        index=False,
        header=not header_written,
        encoding="utf-8",
    )

    header_written = True
    rows_written += len(chunk)

print(f"Input file: {INPUT_PATH}")
print(f"Created: {OUTPUT_PATH}")
print(f"Rows written: {rows_written:,}")
print(f"Columns in output: {len(output_cols)}")
print(f"Output columns: {output_cols}")
