"""Data-cleaning pipeline functions.

Each function performs a single, well-defined cleaning step and returns
both the cleaned DataFrame and a short summary dict for audit logging.

Memory note: functions modify the DataFrame in-place where possible and
only copy when the operation requires it (e.g., dropna / drop_duplicates
always return new objects internally).
"""

from __future__ import annotations

import gc

import numpy as np
import pandas as pd

from src.eda.analysis import cap_outliers, impute_with_global_median
from src.eda.config import GRADE_ORDER, NOVA_ORDER
from src.eda.data import memory_usage_mb, optimize_memory

from .config import NON_MODELLING_COLS, REDUNDANT_COLS, TARGET_COL


# ── Step helpers ─────────────────────────────────────────────────────────────


def drop_missing_target(
    df: pd.DataFrame,
    target_col: str = TARGET_COL,
) -> tuple[pd.DataFrame, int]:
    """Drop rows where the target variable is missing."""
    n_before = len(df)
    df = df.dropna(subset=[target_col])
    return df, n_before - len(df)


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int, int]:
    """Remove exact duplicate rows and barcode-level duplicates."""
    n0 = len(df)
    df = df.drop_duplicates()
    n_exact = n0 - len(df)

    n1 = len(df)
    if "code" in df.columns:
        df = df.drop_duplicates(subset=["code"], keep="first")
    n_barcode = n1 - len(df)

    return df, n_exact, n_barcode


def drop_redundant_columns(
    df: pd.DataFrame,
    cols: list[str] | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    """Drop columns that are redundant for modelling."""
    to_drop = [c for c in (cols or REDUNDANT_COLS) if c in df.columns]
    return df.drop(columns=to_drop), to_drop


def drop_non_modelling_columns(
    df: pd.DataFrame,
    cols: list[str] | None = None,
) -> tuple[pd.DataFrame, list[str]]:
    """Drop columns not needed for modelling (leaky labels, unused metadata)."""
    to_drop = [c for c in (cols or NON_MODELLING_COLS) if c in df.columns]
    return df.drop(columns=to_drop), to_drop


def standardize_nutrition_grade(df: pd.DataFrame) -> pd.DataFrame:
    """Ensure nutrition_grade_fr is lowercase and within GRADE_ORDER."""
    if "nutrition_grade_fr" not in df.columns:
        return df
    grades = df["nutrition_grade_fr"].astype("string").str.strip().str.lower()
    df["nutrition_grade_fr"] = grades.where(grades.isin(GRADE_ORDER))
    return df


def standardize_nova_group(df: pd.DataFrame) -> pd.DataFrame:
    """Coerce nova_group to rounded Int8 values in NOVA_ORDER."""
    if "nova_group" not in df.columns:
        return df
    nova = pd.to_numeric(df["nova_group"], errors="coerce").round()
    df["nova_group"] = nova.where(nova.isin(NOVA_ORDER)).astype("Int8")
    return df


def clean_text_columns(df: pd.DataFrame) -> pd.DataFrame:
    """Fill NaN in free-text columns with empty strings and strip whitespace."""
    text_cols = ["product_name", "brands", "ingredients_text", "categories_en"]
    for col in text_cols:
        if col in df.columns:
            df[col] = df[col].fillna("").astype(str).str.strip()
    return df


# ── Orchestrator ─────────────────────────────────────────────────────────────


def run_cleaning_pipeline(
    df: pd.DataFrame,
    nutrient_cols: list[str],
    *,
    cap_lower: float = 0.01,
    cap_upper: float = 0.99,
) -> tuple[pd.DataFrame, list[str], pd.DataFrame]:
    """Execute the full cleaning pipeline and return (df_clean, nutrient_cols_clean, log_df).

    Steps
    -----
    1. Outlier capping  (percentile-based)
    2. Missing-value imputation  (global median)
    3. Drop rows missing the target variable
    4. Remove exact- and barcode-level duplicates
    5. Drop redundant columns  (sodium_100g)
    6. Drop non-modelling columns  (nutrition_grade_fr, countries_en, pnns_groups_2)
    7. Standardize categorical labels
    8. Clean free-text columns

    Returns
    -------
    df_clean : pd.DataFrame
    nutrient_cols_clean : list[str]  — nutrient columns remaining after drops
    log_df : pd.DataFrame  — audit log with step name + detail
    """
    log: list[dict[str, str | int]] = []
    rows_start = len(df)

    # 1  Outlier capping
    df, _ = cap_outliers(df, nutrient_cols, cap_lower, cap_upper)
    log.append({"step": "Outlier capping", "detail": f"{cap_lower:.0%}–{cap_upper:.0%} percentile clipping"})

    # 2  Median imputation
    df, imp_summary = impute_with_global_median(df, nutrient_cols)
    log.append({"step": "Median imputation", "detail": f"{len(imp_summary)} columns imputed"})

    # 3  Drop missing target
    df, n_dropped_target = drop_missing_target(df)
    log.append({"step": "Drop missing target", "detail": f"{n_dropped_target:,} rows dropped"})

    # 4  Duplicates
    df, n_exact, n_barcode = remove_duplicates(df)
    log.append({"step": "Remove exact duplicates", "detail": f"{n_exact:,} rows dropped"})
    log.append({"step": "Remove barcode duplicates", "detail": f"{n_barcode:,} rows dropped"})

    # 5  Redundant columns
    df, dropped_cols = drop_redundant_columns(df)
    nutrient_cols_clean = [c for c in nutrient_cols if c not in dropped_cols]
    log.append({"step": "Drop redundant columns", "detail": ", ".join(dropped_cols) or "none"})

    # 6  Non-modelling columns (leaky labels, unused metadata)
    df, dropped_non_model = drop_non_modelling_columns(df)
    log.append({"step": "Drop non-modelling columns", "detail": ", ".join(dropped_non_model) or "none"})

    # 7  Standardize labels
    df = standardize_nova_group(df)
    log.append({"step": "Standardize labels", "detail": "nova_group"})

    # 8  Text cleaning
    df = clean_text_columns(df)
    log.append({"step": "Clean text columns", "detail": "NaN → empty string, strip whitespace"})

    rows_end = len(df)
    log.append({"step": "TOTAL", "detail": f"{rows_start:,} → {rows_end:,} rows ({rows_start - rows_end:,} removed)"})

    # Final memory compaction
    df = optimize_memory(df)
    df = df.reset_index(drop=True)
    gc.collect()

    return df, nutrient_cols_clean, pd.DataFrame(log)
