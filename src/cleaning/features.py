"""Feature-engineering functions for the cleaning pipeline.

Each function takes a DataFrame, creates new columns, and returns the
augmented DataFrame.  All feature names use snake_case to stay consistent
with the nutrient columns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

from .config import (
    CATEGORY_ENCODE_COLS,
    HIGH_CORR_THRESHOLD,
    LOW_VARIANCE_THRESHOLD,
    TOP_ADDITIVE_COUNT,
)


# ── Nutrient Ratios ─────────────────────────────────────────────────────────


def create_nutrient_ratios(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Derive nutrient ratio features from base nutrient columns.

    Returns the augmented DataFrame and a list of new column names.
    """
    df = df.copy()
    created: list[str] = []

    def _safe_ratio(
        numerator: pd.Series,
        denominator: pd.Series,
        name: str,
    ) -> None:
        ratio = numerator / denominator.replace(0, np.nan)
        df[name] = ratio.clip(upper=ratio.quantile(0.99))
        created.append(name)

    if "sugars_100g" in df.columns and "carbohydrates_100g" in df.columns:
        _safe_ratio(df["sugars_100g"], df["carbohydrates_100g"], "sugar_to_carb_ratio")

    if "saturated-fat_100g" in df.columns and "fat_100g" in df.columns:
        _safe_ratio(df["saturated-fat_100g"], df["fat_100g"], "sat_fat_to_fat_ratio")

    if "fat_100g" in df.columns and "energy_100g" in df.columns:
        # Fat contributes ~37 kJ per gram
        df["fat_energy_pct"] = (df["fat_100g"] * 37) / df["energy_100g"].replace(0, np.nan)
        df["fat_energy_pct"] = df["fat_energy_pct"].clip(0, 1)
        created.append("fat_energy_pct")

    if "proteins_100g" in df.columns and "energy_100g" in df.columns:
        # Protein contributes ~17 kJ per gram
        df["protein_energy_pct"] = (df["proteins_100g"] * 17) / df["energy_100g"].replace(0, np.nan)
        df["protein_energy_pct"] = df["protein_energy_pct"].clip(0, 1)
        created.append("protein_energy_pct")

    if "fiber_100g" in df.columns and "carbohydrates_100g" in df.columns:
        _safe_ratio(df["fiber_100g"], df["carbohydrates_100g"], "fiber_to_carb_ratio")

    if "salt_100g" in df.columns and "energy_100g" in df.columns:
        _safe_ratio(df["salt_100g"], df["energy_100g"], "salt_per_energy")

    # Fill NaN ratios with 0 (occurs when denominator was 0 or missing)
    for col in created:
        df[col] = df[col].fillna(0)

    return df, created


# ── Additive Features ───────────────────────────────────────────────────────


def create_additive_features(
    df: pd.DataFrame,
    top_n: int = TOP_ADDITIVE_COUNT,
) -> tuple[pd.DataFrame, list[str]]:
    """Create features derived from additive information.

    Features
    --------
    - has_additives : binary flag
    - additives_count : cleaned count (0 when missing)
    - add_<name> : binary flag for each of the top-N most frequent additives
    """
    df = df.copy()
    created: list[str] = []

    # Cleaned count
    if "additives_n" in df.columns:
        df["additives_count"] = df["additives_n"].fillna(0).astype(int)
    elif "additives_tags" in df.columns:
        df["additives_count"] = (
            df["additives_tags"]
            .fillna("")
            .apply(lambda v: len([a for a in str(v).split(",") if a.strip()]))
        )
    else:
        df["additives_count"] = 0
    created.append("additives_count")

    # Binary flag
    df["has_additives"] = (df["additives_count"] > 0).astype(int)
    created.append("has_additives")

    # Top-N individual additive flags
    if "additives_tags" in df.columns:
        all_additives = (
            df["additives_tags"]
            .dropna()
            .str.split(",")
            .explode()
            .str.strip()
            .str.replace(r"^en:", "", regex=True)
            .replace("", np.nan)
            .dropna()
        )
        top_additives = all_additives.value_counts().head(top_n).index.tolist()

        for additive in top_additives:
            col_name = f"add_{additive.replace('-', '_')}"
            df[col_name] = (
                df["additives_tags"]
                .fillna("")
                .str.contains(additive, case=False, regex=False)
                .astype(int)
            )
            created.append(col_name)

    return df, created


# ── Ingredient Features ─────────────────────────────────────────────────────


def create_ingredient_features(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Create features from the ingredients_text column.

    Features
    --------
    - ingredient_count : number of comma-separated ingredients
    - ingredients_length : character length of the ingredient list
    """
    df = df.copy()
    created: list[str] = []

    if "ingredients_text" in df.columns:
        text = df["ingredients_text"].fillna("").astype(str)

        df["ingredient_count"] = text.apply(
            lambda v: len([i for i in v.split(",") if i.strip()]) if v else 0
        )
        created.append("ingredient_count")

        df["ingredients_length"] = text.str.len()
        created.append("ingredients_length")

    return df, created


# ── Category Encoding ───────────────────────────────────────────────────────


def encode_categories(
    df: pd.DataFrame,
    cols: list[str] | None = None,
    min_frequency: int = 100,
) -> tuple[pd.DataFrame, list[str], dict[str, LabelEncoder]]:
    """Label-encode categorical columns, grouping rare values as 'other'.

    Returns the augmented DataFrame, list of new column names, and a dict
    of fitted LabelEncoders (for inverse transform in production).
    """
    cols = cols or CATEGORY_ENCODE_COLS
    df = df.copy()
    created: list[str] = []
    encoders: dict[str, LabelEncoder] = {}

    for col in cols:
        if col not in df.columns:
            continue

        series = df[col].fillna("unknown").astype(str).str.strip().str.lower()

        # Group rare categories
        freq = series.value_counts()
        rare_labels = freq[freq < min_frequency].index
        series = series.where(~series.isin(rare_labels), other="other")

        enc = LabelEncoder()
        enc_col = f"{col}_encoded"
        df[enc_col] = enc.fit_transform(series)
        created.append(enc_col)
        encoders[col] = enc

    return df, created, encoders


# ── Nutritional Profile Score ────────────────────────────────────────────────


def create_nutrient_profile_score(df: pd.DataFrame) -> tuple[pd.DataFrame, list[str]]:
    """Compute a simplified nutritional-profile score.

    Negative points (higher = worse):
        energy, saturated fat, sugars, salt
    Positive points (higher = better):
        fiber, proteins

    The final score = negative − positive.  Higher values indicate a
    nutritionally poorer product.
    """
    df = df.copy()
    created: list[str] = []

    neg_cols = ["energy_100g", "saturated-fat_100g", "sugars_100g", "salt_100g"]
    pos_cols = ["fiber_100g", "proteins_100g"]

    avail_neg = [c for c in neg_cols if c in df.columns]
    avail_pos = [c for c in pos_cols if c in df.columns]

    if not avail_neg and not avail_pos:
        return df, created

    # Min-max scale each component to [0, 1] before summing
    for col in avail_neg + avail_pos:
        col_min = df[col].min()
        col_max = df[col].max()
        rng = col_max - col_min
        df[f"_scaled_{col}"] = (df[col] - col_min) / rng if rng > 0 else 0

    df["neg_score"] = df[[f"_scaled_{c}" for c in avail_neg]].sum(axis=1)
    df["pos_score"] = df[[f"_scaled_{c}" for c in avail_pos]].sum(axis=1)
    df["nutrient_profile_score"] = df["neg_score"] - df["pos_score"]
    created.append("nutrient_profile_score")

    # Clean up temp columns
    temp_cols = [c for c in df.columns if c.startswith("_scaled_")] + ["neg_score", "pos_score"]
    df = df.drop(columns=temp_cols)

    return df, created


# ── Feature Selection ────────────────────────────────────────────────────────


def drop_low_variance_features(
    df: pd.DataFrame,
    feature_cols: list[str],
    threshold: float = LOW_VARIANCE_THRESHOLD,
) -> tuple[pd.DataFrame, list[str]]:
    """Drop numeric features whose variance falls below *threshold*."""
    variances = df[feature_cols].var()
    low_var = variances[variances < threshold].index.tolist()
    return df.drop(columns=low_var), low_var


def drop_highly_correlated_features(
    df: pd.DataFrame,
    feature_cols: list[str],
    threshold: float = HIGH_CORR_THRESHOLD,
) -> tuple[pd.DataFrame, list[str]]:
    """Drop one of each pair whose Pearson |r| exceeds *threshold*.

    For each highly-correlated pair the column appearing later in
    *feature_cols* is dropped.
    """
    corr = df[feature_cols].corr().abs()
    upper_tri = corr.where(np.triu(np.ones(corr.shape, dtype=bool), k=1))
    to_drop = [col for col in upper_tri.columns if (upper_tri[col] > threshold).any()]
    return df.drop(columns=to_drop), to_drop


# ── Orchestrator ─────────────────────────────────────────────────────────────


def run_feature_engineering(
    df: pd.DataFrame,
    nutrient_cols: list[str],
) -> tuple[pd.DataFrame, list[str], pd.DataFrame]:
    """Run the full feature-engineering pipeline.

    Returns
    -------
    df_fe : pd.DataFrame
    all_feature_cols : list[str]  — union of nutrient + engineered features
    log_df : pd.DataFrame  — audit log
    """
    log: list[dict[str, str | int]] = []

    # 1  Nutrient ratios
    df, ratio_cols = create_nutrient_ratios(df)
    log.append({"step": "Nutrient ratios", "features_added": len(ratio_cols), "detail": ", ".join(ratio_cols)})

    # 2  Additive features
    df, add_cols = create_additive_features(df)
    log.append({"step": "Additive features", "features_added": len(add_cols), "detail": f"{len(add_cols)} columns"})

    # 3  Ingredient features
    df, ing_cols = create_ingredient_features(df)
    log.append({"step": "Ingredient features", "features_added": len(ing_cols), "detail": ", ".join(ing_cols)})

    # 4  Category encoding
    df, cat_cols, _ = encode_categories(df)
    log.append({"step": "Category encoding", "features_added": len(cat_cols), "detail": ", ".join(cat_cols)})

    # 5  Nutrient profile score
    df, nps_cols = create_nutrient_profile_score(df)
    log.append({"step": "Nutrient profile score", "features_added": len(nps_cols), "detail": ", ".join(nps_cols)})

    all_feature_cols = nutrient_cols + ratio_cols + add_cols + ing_cols + cat_cols + nps_cols

    log.append({
        "step": "TOTAL",
        "features_added": len(all_feature_cols) - len(nutrient_cols),
        "detail": f"{len(all_feature_cols)} total feature columns",
    })

    return df, all_feature_cols, pd.DataFrame(log)
