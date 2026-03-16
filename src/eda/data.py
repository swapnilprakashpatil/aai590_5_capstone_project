from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

import pandas as pd

from .config import BASE_NUTRIENT_COLS, GRADE_ORDER, META_COLS, NOVA_ORDER


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
        chunk_size: int = 100_000,
    ) -> LoadedDataset:
        dataset_path = Path(dataset_path)
        delimiter = self.detect_delimiter(dataset_path)
        usecols = lambda col: col in self.required_cols or col == "nutriscore_grade"

        if nrows is None:
            df = pd.read_csv(
                dataset_path,
                sep=delimiter,
                low_memory=False,
                usecols=usecols,
                on_bad_lines="skip",
            )
        else:
            chunks: list[pd.DataFrame] = []
            rows_loaded = 0
            for chunk in pd.read_csv(
                dataset_path,
                sep=delimiter,
                low_memory=False,
                usecols=usecols,
                on_bad_lines="skip",
                chunksize=chunk_size,
            ):
                chunks.append(chunk)
                rows_loaded += len(chunk)
                if rows_loaded >= nrows:
                    break
            df = pd.concat(chunks, ignore_index=True)
            if len(df) > nrows:
                df = df.iloc[:nrows].copy()

        if "nutrition_grade_fr" not in df.columns and "nutriscore_grade" in df.columns:
            df = df.rename(columns={"nutriscore_grade": "nutrition_grade_fr"})

        nutrient_cols = [col for col in self.base_nutrient_cols if col in df.columns]
        if not nutrient_cols:
            raise ValueError("No nutrient columns were loaded. Check the dataset delimiter and schema.")

        for col in nutrient_cols + ["additives_n", "nova_group"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")

        if "nutrition_grade_fr" in df.columns:
            grades = df["nutrition_grade_fr"].astype("string").str.strip().str.lower()
            df["nutrition_grade_fr"] = grades.where(grades.isin(GRADE_ORDER))

        if "nova_group" in df.columns:
            nova = df["nova_group"].round()
            df["nova_group"] = nova.where(nova.isin(NOVA_ORDER)).astype("Int64")

        df = df[df[nutrient_cols].notna().any(axis=1)].copy()

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
