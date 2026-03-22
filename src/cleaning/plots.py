"""Visualisations for the data-cleaning and feature-engineering pipeline."""

from __future__ import annotations

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import seaborn as sns

from src.eda.config import GRADE_ORDER, NOVA_ORDER


class CleaningFEPlotter:
    """All cleaning / feature-engineering visualisations in one class."""

    def __init__(self) -> None:
        sns.set_theme(style="whitegrid", palette="muted", font_scale=1.1)
        plt.rcParams.update({"figure.dpi": 110, "figure.figsize": (12, 5)})
        self.nova_palette = {1: "#2c7fb8", 2: "#7fcdbb", 3: "#fdbb84", 4: "#d7301f"}

    @staticmethod
    def _title(col: str) -> str:
        return col.replace("_100g", "").replace("_", " ").replace("-", " ").title()

    # ── Cleaning summary ─────────────────────────────────────────────────

    def plot_cleaning_summary(
        self,
        rows_before: int,
        rows_after: int,
        cols_before: int,
        cols_after: int,
    ) -> None:
        """Side-by-side bars: rows and columns before vs after cleaning."""
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        labels = ["Before", "After"]
        for ax, values, ylabel, title in [
            (axes[0], [rows_before, rows_after], "Rows", "Row Count"),
            (axes[1], [cols_before, cols_after], "Columns", "Column Count"),
        ]:
            bars = ax.bar(labels, values, color=["#4C72B0", "#55A868"], edgecolor="white", width=0.5)
            for bar, val in zip(bars, values):
                ax.text(
                    bar.get_x() + bar.get_width() / 2,
                    bar.get_height() + max(1, max(values) * 0.01),
                    f"{val:,}",
                    ha="center", va="bottom", fontsize=10,
                )
            ax.set_ylabel(ylabel)
            ax.set_title(title)

        plt.suptitle("Dataset Shape — Before vs After Cleaning", fontsize=14, y=1.02)
        plt.tight_layout()
        plt.show()

    # ── Target distribution ──────────────────────────────────────────────

    def plot_target_distribution(
        self,
        df: pd.DataFrame,
        target_col: str = "nova_group",
    ) -> None:
        """Bar + pie for the target variable after cleaning."""
        counts = df[target_col].value_counts().reindex(NOVA_ORDER, fill_value=0)
        pcts = counts / counts.sum() * 100

        fig, axes = plt.subplots(1, 2, figsize=(16, 5))
        bars = axes[0].bar(
            [f"NOVA {g}" for g in NOVA_ORDER],
            counts.values,
            color=[self.nova_palette[g] for g in NOVA_ORDER],
            edgecolor="white",
        )
        for bar, pct in zip(bars, pcts):
            axes[0].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(1, counts.max() * 0.01),
                f"{pct:.1f}%", ha="center", va="bottom", fontsize=9,
            )
        axes[0].set_title("NOVA Group Distribution (Cleaned)")
        axes[0].set_ylabel("Products")

        axes[1].pie(
            counts.values,
            labels=[f"NOVA {g}" for g in NOVA_ORDER],
            autopct="%1.1f%%",
            colors=[self.nova_palette[g] for g in NOVA_ORDER],
            startangle=90,
            wedgeprops={"linewidth": 1, "edgecolor": "white"},
        )
        axes[1].set_title("NOVA Group — Share")
        plt.suptitle("Target Variable After Cleaning", fontsize=14, y=1.02)
        plt.tight_layout()
        plt.show()

    # ── Engineered feature distributions ─────────────────────────────────

    def plot_engineered_distributions(
        self,
        df: pd.DataFrame,
        feature_cols: list[str],
        max_cols: int = 12,
    ) -> None:
        """Histogram + KDE for each engineered feature."""
        cols = feature_cols[:max_cols]
        n = len(cols)
        ncols = min(4, n)
        nrows = (n + ncols - 1) // ncols

        fig, axes = plt.subplots(nrows, ncols, figsize=(5 * ncols, 4 * nrows))
        axes = np.array(axes).ravel()

        for i, col in enumerate(cols):
            data = df[col].dropna()
            upper = data.quantile(0.99)
            clipped = data[data <= upper]
            axes[i].hist(clipped, bins=60, density=True, color="#4C72B0", alpha=0.6, edgecolor="none")
            axes[i].set_title(self._title(col), fontsize=10)
            axes[i].set_ylabel("Density")

        for j in range(n, len(axes)):
            axes[j].set_axis_off()

        plt.suptitle("Engineered Feature Distributions", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

    # ── Feature-target box plots ─────────────────────────────────────────

    def plot_features_by_target(
        self,
        df: pd.DataFrame,
        feature_cols: list[str],
        target_col: str = "nova_group",
        max_cols: int = 12,
    ) -> None:
        """Box plots of engineered features grouped by NOVA class."""
        cols = feature_cols[:max_cols]
        n = len(cols)
        ncols = min(4, n)
        nrows = (n + ncols - 1) // ncols

        plot_df = df[df[target_col].notna()].copy()
        plot_df[target_col] = plot_df[target_col].astype("Int64").astype(str)
        plot_order = [str(g) for g in NOVA_ORDER]
        palette = {str(k): v for k, v in self.nova_palette.items()}

        fig, axes = plt.subplots(nrows, ncols, figsize=(5 * ncols, 4 * nrows))
        axes = np.array(axes).ravel()

        for i, col in enumerate(cols):
            upper = plot_df[col].quantile(0.99)
            clipped = plot_df[plot_df[col] <= upper]
            sns.boxplot(
                data=clipped, x=target_col, y=col,
                order=plot_order, palette=palette,
                fliersize=1, linewidth=0.8, ax=axes[i],
            )
            axes[i].set_title(self._title(col), fontsize=10)
            axes[i].set_xlabel("NOVA Group")
            axes[i].set_xticklabels([f"NOVA {g}" for g in NOVA_ORDER])

        for j in range(n, len(axes)):
            axes[j].set_axis_off()

        plt.suptitle("Engineered Features by NOVA Group", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

    # ── Final correlation matrix ─────────────────────────────────────────

    def plot_final_correlation(
        self,
        df: pd.DataFrame,
        feature_cols: list[str],
    ) -> None:
        """Lower-triangle heatmap of the final feature set."""
        corr = df[feature_cols].corr()
        mask = np.triu(np.ones_like(corr, dtype=bool))

        short = [c.replace("_100g", "").replace("_", " ").replace("-", " ")[:18] for c in feature_cols]
        rename = dict(zip(feature_cols, short))

        fig, ax = plt.subplots(figsize=(max(10, len(feature_cols) * 0.7), max(8, len(feature_cols) * 0.55)))
        sns.heatmap(
            corr.rename(index=rename, columns=rename),
            mask=mask, annot=len(feature_cols) <= 20,
            fmt=".2f" if len(feature_cols) <= 20 else "",
            cmap="coolwarm", center=0, linewidths=0.3,
            ax=ax,
        )
        ax.set_title("Feature Correlation Matrix (Final Feature Set)", fontsize=13)
        plt.tight_layout()
        plt.show()

    # ── Feature selection summary ────────────────────────────────────────

    def plot_feature_selection_summary(
        self,
        before_count: int,
        after_count: int,
        dropped_low_var: list[str],
        dropped_high_corr: list[str],
    ) -> None:
        """Waterfall-style summary of features removed."""
        stages = ["Initial", "–Low Var", "–High Corr", "Final"]
        values = [
            before_count,
            before_count - len(dropped_low_var),
            before_count - len(dropped_low_var) - len(dropped_high_corr),
            after_count,
        ]
        colors = ["#4C72B0", "#e8a838", "#e8a838", "#55A868"]

        fig, ax = plt.subplots(figsize=(10, 5))
        bars = ax.bar(stages, values, color=colors, edgecolor="white", width=0.5)
        for bar, val in zip(bars, values):
            ax.text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + 0.3,
                str(val), ha="center", va="bottom", fontsize=11,
            )
        ax.set_ylabel("Feature Count")
        ax.set_title("Feature Selection Pipeline", fontsize=13)
        plt.tight_layout()
        plt.show()

    # ── Train / test split confirmation ──────────────────────────────────

    def plot_split_class_balance(
        self,
        y_train: pd.Series,
        y_test: pd.Series,
    ) -> None:
        """Compare NOVA-group proportions between train and test sets."""
        train_pct = y_train.value_counts(normalize=True).reindex(NOVA_ORDER, fill_value=0) * 100
        test_pct = y_test.value_counts(normalize=True).reindex(NOVA_ORDER, fill_value=0) * 100

        x = np.arange(len(NOVA_ORDER))
        width = 0.35

        fig, ax = plt.subplots(figsize=(10, 5))
        ax.bar(x - width / 2, train_pct.values, width, label="Train", color="#4C72B0", edgecolor="white")
        ax.bar(x + width / 2, test_pct.values, width, label="Test", color="#55A868", edgecolor="white")
        ax.set_xticks(x)
        ax.set_xticklabels([f"NOVA {g}" for g in NOVA_ORDER])
        ax.set_ylabel("Share (%)")
        ax.set_title("Class Balance — Train vs Test", fontsize=13)
        ax.legend()
        plt.tight_layout()
        plt.show()
