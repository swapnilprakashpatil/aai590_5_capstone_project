from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats

from .config import GRADE_ORDER


def compute_high_correlation_pairs(
    nutrient_data: pd.DataFrame,
    nutrient_cols: list[str],
    threshold: float = 0.85,
) -> tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
    pearson = nutrient_data.corr(method="pearson")
    spearman = nutrient_data.corr(method="spearman")

    high_corr: list[tuple[str, str, float]] = []
    for i in range(len(nutrient_cols)):
        for j in range(i + 1, len(nutrient_cols)):
            coeff = pearson.iloc[i, j]
            if abs(coeff) > threshold:
                high_corr.append((nutrient_cols[i], nutrient_cols[j], round(float(coeff), 3)))

    high_corr_df = pd.DataFrame(high_corr, columns=["Feature A", "Feature B", "Pearson r"])
    return pearson, spearman, high_corr_df


def compute_kruskal_summary(
    df: pd.DataFrame,
    nutrient_cols: list[str],
    group_col: str = "nutrition_grade_fr",
    group_order: list[str] | None = None,
) -> pd.DataFrame:
    order = group_order or GRADE_ORDER
    analysis_df = df[df[group_col].notna()].copy()

    results: list[dict[str, float | str]] = []
    for col in nutrient_cols:
        groups = [
            analysis_df.loc[analysis_df[group_col] == label, col].dropna().values
            for label in order
        ]
        groups = [group for group in groups if len(group) > 1]
        if len(groups) < 2:
            continue
        stat, p_value = stats.kruskal(*groups)
        results.append({"feature": col, "H-statistic": round(float(stat), 1), "p-value": float(p_value)})

    if not results:
        return pd.DataFrame(columns=["feature", "H-statistic", "p-value"])

    return pd.DataFrame(results).sort_values("H-statistic", ascending=False)


def cap_outliers(
    df: pd.DataFrame,
    nutrient_cols: list[str],
    lower_quantile: float = 0.01,
    upper_quantile: float = 0.99,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    summary: list[dict[str, float | str | int]] = []

    for col in nutrient_cols:
        q1 = df[col].quantile(lower_quantile)
        q3 = df[col].quantile(upper_quantile)
        iqr = q3 - q1
        lower_bound = q1 - 1.5 * iqr
        upper_bound = q3 + 1.5 * iqr
        non_null_count = int(df[col].notna().sum())
        outliers = int(((df[col] < lower_bound) | (df[col] > upper_bound)).sum())
        outlier_pct = (outliers / non_null_count * 100) if non_null_count else 0.0
        summary.append({"feature": col, "outliers": outliers, "outlier_pct": round(outlier_pct, 2)})
        df[col] = df[col].clip(lower=df[col].quantile(lower_quantile), upper=df[col].quantile(upper_quantile))

    summary_df = pd.DataFrame(summary).sort_values("outlier_pct", ascending=False)
    return df, summary_df


def impute_with_global_median(df: pd.DataFrame, nutrient_cols: list[str]) -> tuple[pd.DataFrame, pd.DataFrame]:
    records: list[dict[str, float | str]] = []

    for col in nutrient_cols:
        global_median = float(df[col].median())
        df[col] = df[col].fillna(global_median)
        records.append({"feature": col, "global_median": round(global_median, 3), "strategy": "global median"})

    return df, pd.DataFrame(records)


def build_pairplot_sample(
    df: pd.DataFrame,
    pair_cols: list[str],
    group_col: str = "nutrition_grade_fr",
    group_order: list[str] | None = None,
    per_group: int = 500,
) -> pd.DataFrame:
    order = group_order or GRADE_ORDER
    sample_df = (
        df[pair_cols + [group_col]]
        .dropna()
        .groupby(group_col, group_keys=False)
        .apply(lambda group: group.sample(min(per_group, len(group)), random_state=42))
    )

    sample_df[group_col] = pd.Categorical(sample_df[group_col], categories=order, ordered=True)
    for col in pair_cols:
        upper = sample_df[col].quantile(0.99)
        sample_df[col] = sample_df[col].clip(upper=upper)
    return sample_df.reset_index(drop=True)
