from __future__ import annotations

import gc
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd

from .config import BASE_NUTRIENT_COLS, GRADE_ORDER, META_COLS, NOVA_ORDER


# ── Dtype maps for lean loading ──────────────────────────────────────────────

_FLOAT32_COLS = set(BASE_NUTRIENT_COLS) | {
    "additives_n",
    "ingredients_from_palm_oil_n",
    "ingredients_that_may_be_from_palm_oil_n",
}

_CATEGORY_COLS = {
    "nutrition_grade_fr",
    "nutriscore_grade",
    "pnns_groups_1",
    "pnns_groups_2",
    "countries_en",
}

_STR_COLS = {
    "code",
    "product_name",
    "brands",
    "categories_en",
    "ingredients_text",
    "additives_tags",
}


def _build_dtype_map(columns: list[str]) -> dict[str, str | type]:
    """Return a column→dtype mapping for memory-efficient CSV parsing."""
    dtype_map: dict[str, str | type] = {}
    for col in columns:
        if col == "nova_group":
            continue  # handled post-load as Int8
        if col in _FLOAT32_COLS:
            dtype_map[col] = "float32"
        elif col in _CATEGORY_COLS:
            dtype_map[col] = "category"
        elif col in _STR_COLS:
            dtype_map[col] = "str"
    return dtype_map


def optimize_memory(df: pd.DataFrame) -> pd.DataFrame:
    """Downcast numeric columns in-place to save memory.

    * float64 → float32
    * int64   → smallest signed int that fits
    * object columns with <50% unique values → category
    """
    for col in df.columns:
        col_type = df[col].dtype
        if col_type == np.float64:
            df[col] = df[col].astype(np.float32)
        elif col_type == np.int64:
            df[col] = pd.to_numeric(df[col], downcast="signed")
        elif col_type == object:
            n_unique = df[col].nunique(dropna=False)
            if n_unique / max(len(df), 1) < 0.5:
                df[col] = df[col].astype("category")
    return df


def memory_usage_mb(df: pd.DataFrame) -> float:
    """Return total memory usage in MB (deep introspection)."""
    return df.memory_usage(deep=True).sum() / 1024**2


@dataclass(slots=True)
class LoadedDataset:
    df: pd.DataFrame
    nutrient_cols: list[str]
    meta_cols: list[str]
    dataset_path: str
    delimiter: str


class OpenFoodFactsEDADataLoader:
    def __init__(self, meta_cols: list[str] | None = None, nutrient_cols: list[str] | None = None) -> None:
        self.meta_cols = list(meta_cols or META_COLS)
        self.base_nutrient_cols = list(nutrient_cols or BASE_NUTRIENT_COLS)
        self.required_cols = self.meta_cols + self.base_nutrient_cols

    @staticmethod
    def detect_delimiter(dataset_path: str | Path) -> str:
        with open(dataset_path, "r", encoding="utf-8", errors="ignore") as handle:
            header_line = handle.readline()
        return "\t" if header_line.count("\t") > header_line.count(",") else ","

    def load(
        self,
        dataset_path: str | Path,
        nrows: int | None = None,
        chunk_size: int = 250_000,
    ) -> LoadedDataset:
        """Load the dataset with memory-optimised chunked reading.

        * Specifies lean dtypes (float32, category, str) at parse time.
        * Always reads in chunks to cap peak memory.
        * Downcasts remaining wide types after concatenation.
        """
        dataset_path = Path(dataset_path)
        delimiter = self.detect_delimiter(dataset_path)

        wanted = set(self.required_cols) | {"nutriscore_grade"}
        usecols = lambda col: col in wanted  # noqa: E731
        dtype_map = _build_dtype_map(list(wanted))

        chunks: list[pd.DataFrame] = []
        rows_loaded = 0
        reader = pd.read_csv(
            dataset_path,
            sep=delimiter,
            usecols=usecols,
            dtype=dtype_map,
            on_bad_lines="skip",
            chunksize=chunk_size,
            low_memory=True,
        )

        for chunk in reader:
            chunks.append(chunk)
            rows_loaded += len(chunk)
            if rows_loaded % 500_000 == 0 or (nrows and rows_loaded >= nrows):
                print(f"  … loaded {rows_loaded:,} rows", end="\r")
            if nrows and rows_loaded >= nrows:
                break

        reader.close()
        df = pd.concat(chunks, ignore_index=True)
        del chunks
        gc.collect()

        if nrows and len(df) > nrows:
            df = df.iloc[:nrows]

        print(f"  ✓ {len(df):,} rows loaded")

        if "nutrition_grade_fr" not in df.columns and "nutriscore_grade" in df.columns:
            df = df.rename(columns={"nutriscore_grade": "nutrition_grade_fr"})

        nutrient_cols = [col for col in self.base_nutrient_cols if col in df.columns]
        if not nutrient_cols:
            raise ValueError("No nutrient columns were loaded. Check the dataset delimiter and schema.")

        # Coerce columns that may have arrived as mixed types
        for col in nutrient_cols + [
            "additives_n",
            "nova_group",
            "ingredients_from_palm_oil_n",
            "ingredients_that_may_be_from_palm_oil_n",
        ]:
            if col in df.columns and not pd.api.types.is_float_dtype(df[col]):
                df[col] = pd.to_numeric(df[col], errors="coerce").astype("float32")

        if "nutrition_grade_fr" in df.columns:
            if df["nutrition_grade_fr"].dtype.name != "category":
                grades = df["nutrition_grade_fr"].astype("string").str.strip().str.lower()
                df["nutrition_grade_fr"] = pd.Categorical(
                    grades.where(grades.isin(GRADE_ORDER)), categories=GRADE_ORDER,
                )
            else:
                df["nutrition_grade_fr"] = df["nutrition_grade_fr"].cat.rename_categories(
                    {c: c.strip().lower() for c in df["nutrition_grade_fr"].cat.categories if isinstance(c, str)}
                )

        if "nova_group" in df.columns:
            nova = pd.to_numeric(df["nova_group"], errors="coerce").round()
            df["nova_group"] = nova.where(nova.isin(NOVA_ORDER)).astype("Int8")

        # Filter rows with at least one non-null nutrient
        df = df[df[nutrient_cols].notna().any(axis=1)]
        df = df.reset_index(drop=True)

        # Final memory optimisation
        df = optimize_memory(df)
        gc.collect()

        return LoadedDataset(
            df=df,
            nutrient_cols=nutrient_cols,
            meta_cols=[col for col in self.meta_cols if col in df.columns],
            dataset_path=str(dataset_path),
            delimiter=delimiter,
        )


def print_dataset_overview(dataset: LoadedDataset) -> None:
    delimiter_label = "TAB" if dataset.delimiter == "\t" else "COMMA"
    print(f"Detected delimiter: {delimiter_label}")
    print(f"Dataset path: {dataset.dataset_path}")
    print(f"Shape: {dataset.df.shape}")
    print(f"Loaded columns ({len(dataset.df.columns)}): {sorted(dataset.df.columns.tolist())}")
    print(
        "Nutrient columns used in EDA "
        f"({len(dataset.nutrient_cols)}): {dataset.nutrient_cols}"
    )
    if "nutrition_grade_fr" in dataset.df.columns:
        print(
            "\nNutri-Score distribution:\n"
            f"{dataset.df['nutrition_grade_fr'].value_counts(dropna=False).sort_index()}"
        )
    if "nova_group" in dataset.df.columns:
        print(
            "\nNOVA distribution:\n"
            f"{dataset.df['nova_group'].value_counts(dropna=False).sort_index()}"
        )
