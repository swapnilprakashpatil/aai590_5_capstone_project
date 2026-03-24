from __future__ import annotations

import math
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.ticker as mticker
import missingno as msno
import seaborn as sns
from scipy import stats
from sklearn.cluster import KMeans
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

from .analysis import build_pairplot_sample
from .config import COMPARE_COLS, GRADE_ORDER, NOVA_ORDER, PAIR_COLS


class OpenFoodFactsEDAPlotter:
    def __init__(self) -> None:
        pd.set_option("display.max_columns", 60)
        pd.set_option("display.float_format", "{:.3f}".format)
        np.random.seed(42)
        sns.set_theme(style="whitegrid", palette="muted", font_scale=1.1)
        plt.rcParams.update({"figure.dpi": 110, "figure.figsize": (12, 5)})
        self.grade_palette = {
            "a": "#1a9641",
            "b": "#a6d96a",
            "c": "#ffffbf",
            "d": "#fdae61",
            "e": "#d7191c",
        }
        self.nova_palette = {
            1: "#2c7fb8",
            2: "#7fcdbb",
            3: "#fdbb84",
            4: "#d7301f",
        }

    @staticmethod
    def _feature_title(column_name: str) -> str:
        return column_name.replace("_100g", "").replace("-", " ").title()

    @staticmethod
    def _grade_frame(df: pd.DataFrame) -> pd.DataFrame:
        return df[df["nutrition_grade_fr"].notna()].copy()

    @staticmethod
    def _nova_frame(df: pd.DataFrame) -> pd.DataFrame:
        return df[df["nova_group"].notna()].copy()

    def plot_missingness_overview(self, df: pd.DataFrame) -> None:
        missing = (df.isnull().sum() / len(df) * 100).sort_values(ascending=False)
        missing_df = missing.reset_index()
        missing_df.columns = ["column", "missing_pct"]

        fig, axes = plt.subplots(1, 2, figsize=(18, 6))
        axes[0].barh(missing_df["column"], missing_df["missing_pct"], color=sns.color_palette("muted"))
        axes[0].axvline(50, color="red", linestyle="--", linewidth=1, label="50% threshold")
        axes[0].axvline(80, color="orange", linestyle="--", linewidth=1, label="80% threshold")
        axes[0].set_xlabel("Missing (%)")
        axes[0].set_title("Missing Data per Column")
        axes[0].legend()
        axes[0].invert_yaxis()

        buckets = [
            (missing_df["missing_pct"] == 0).sum(),
            ((missing_df["missing_pct"] > 0) & (missing_df["missing_pct"] <= 50)).sum(),
            ((missing_df["missing_pct"] > 50) & (missing_df["missing_pct"] <= 80)).sum(),
            (missing_df["missing_pct"] > 80).sum(),
        ]
        labels = ["Complete", "1-50%", "51-80%", ">80%"]
        axes[1].pie(
            buckets,
            labels=labels,
            autopct="%1.0f%%",
            startangle=90,
            colors=["#4CAF50", "#FFC107", "#FF5722", "#F44336"],
        )
        axes[1].set_title("Column Missingness Buckets")
        plt.tight_layout()
        plt.show()

        print(f"Duplicate rows       : {df.duplicated().sum()}")
        print(f"Columns >50% missing : {(missing > 50).sum()}")
        print(f"Columns >80% missing : {(missing > 80).sum()}")

    def plot_missingno_matrix(self, df: pd.DataFrame, nutrient_cols: list[str]) -> None:
        sample = df[nutrient_cols].sample(min(10_000, len(df)), random_state=42)
        fig, axes = plt.subplots(1, 2, figsize=(18, 5))
        msno.matrix(sample, ax=axes[0], sparkline=False, fontsize=10, color=(0.27, 0.52, 0.71))
        axes[0].set_title("Missingno Matrix — Nutritional Features")
        msno.bar(sample, ax=axes[1], fontsize=10, color=(0.27, 0.52, 0.71))
        axes[1].set_title("Completeness per Nutritional Feature")
        plt.tight_layout()
        plt.show()

    def plot_nutriscore_overview(self, df: pd.DataFrame) -> None:
        grade_counts = df["nutrition_grade_fr"].value_counts().reindex(GRADE_ORDER, fill_value=0)
        grade_pct = grade_counts / grade_counts.sum() * 100 if grade_counts.sum() else grade_counts

        fig, axes = plt.subplots(1, 2, figsize=(18, 6))
        bars = axes[0].bar(
            grade_counts.index,
            grade_counts.values,
            color=[self.grade_palette[grade] for grade in GRADE_ORDER],
            edgecolor="white",
        )
        for bar, pct in zip(bars, grade_pct):
            axes[0].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(1, grade_counts.max() * 0.01),
                f"{pct:.1f}%",
                ha="center",
                va="bottom",
                fontsize=9,
            )
        axes[0].set_title("Nutri-Score Distribution — Count")
        axes[0].set_ylabel("Products")
        axes[0].set_xlabel("Nutri-Score Grade")

        axes[1].pie(
            grade_counts.values,
            labels=[grade.upper() for grade in grade_counts.index],
            autopct="%1.1f%%",
            colors=[self.grade_palette[grade] for grade in GRADE_ORDER],
            startangle=90,
            wedgeprops={"linewidth": 1, "edgecolor": "white"},
        )
        axes[1].set_title("Nutri-Score Grade — Share")
        plt.suptitle("Nutritional Quality Overview", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

        print(f"Nutri-Score coverage: {grade_counts.sum() / len(df) * 100:.1f}% of loaded rows")

    def plot_nova_overview(self, df: pd.DataFrame) -> None:
        nova_counts = df["nova_group"].value_counts().sort_index().reindex(NOVA_ORDER, fill_value=0)
        nova_pct = nova_counts / nova_counts.sum() * 100 if nova_counts.sum() else nova_counts

        fig, axes = plt.subplots(1, 2, figsize=(18, 6))
        bars = axes[0].bar(
            [f"NOVA {group}" for group in NOVA_ORDER],
            nova_counts.values,
            color=[self.nova_palette[group] for group in NOVA_ORDER],
            edgecolor="white",
        )
        for bar, pct in zip(bars, nova_pct):
            axes[0].text(
                bar.get_x() + bar.get_width() / 2,
                bar.get_height() + max(1, nova_counts.max() * 0.01),
                f"{pct:.1f}%",
                ha="center",
                va="bottom",
                fontsize=9,
            )
        axes[0].set_title("NOVA Group Distribution — Count")
        axes[0].set_ylabel("Products")
        axes[0].set_xlabel("NOVA Group")

        axes[1].pie(
            nova_counts.values,
            labels=[f"NOVA {group}" for group in NOVA_ORDER],
            autopct="%1.1f%%",
            colors=[self.nova_palette[group] for group in NOVA_ORDER],
            startangle=90,
            wedgeprops={"linewidth": 1, "edgecolor": "white"},
        )
        axes[1].set_title("NOVA Group — Share")
        plt.suptitle("Food Processing Overview", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

        print(f"NOVA coverage: {nova_counts.sum() / len(df) * 100:.1f}% of loaded rows")

    def plot_category_overview(self, df: pd.DataFrame) -> None:
        if "pnns_groups_1" not in df.columns:
            print("pnns_groups_1 not available.")
            return
        counts = df["pnns_groups_1"].dropna().value_counts().head(10)
        fig, ax = plt.subplots(figsize=(12, 6))
        ax.barh(counts.index[::-1], counts.values[::-1], color=sns.color_palette("Greens_r", len(counts)), edgecolor="white")
        ax.set_xlabel("Products")
        ax.set_title("Top 10 Food Categories (PNNS Level 1)")
        plt.tight_layout()
        plt.show()

    def plot_nova_nutriscore_heatmap(self, df: pd.DataFrame) -> None:
        cross_df = self._nova_frame(self._grade_frame(df))
        if cross_df.empty:
            print("nova_group and/or nutrition_grade_fr not available for cross-analysis.")
            return
        heatmap_df = (
            pd.crosstab(cross_df["nova_group"], cross_df["nutrition_grade_fr"], normalize="index")
            .reindex(index=NOVA_ORDER, fill_value=0)
            .reindex(columns=GRADE_ORDER, fill_value=0)
            * 100
        )
        plt.figure(figsize=(8, 5))
        sns.heatmap(
            heatmap_df,
            annot=True,
            fmt=".1f",
            cmap="YlOrRd",
            linewidths=0.3,
            cbar_kws={"label": "% within NOVA group"},
        )
        plt.title("Nutri-Score Composition Within Each NOVA Group")
        plt.xlabel("Nutri-Score Grade")
        plt.ylabel("NOVA Group")
        plt.tight_layout()
        plt.show()

    def plot_nova_nutriscore_stacked_share(self, df: pd.DataFrame) -> None:
        cross_df = self._nova_frame(self._grade_frame(df))
        if cross_df.empty:
            print("nova_group and/or nutrition_grade_fr not available for stacked-share analysis.")
            return
        share_df = (
            pd.crosstab(cross_df["nova_group"], cross_df["nutrition_grade_fr"], normalize="columns")
            .reindex(index=NOVA_ORDER, fill_value=0)
            .reindex(columns=GRADE_ORDER, fill_value=0)
        )
        ax = share_df.T.plot(
            kind="bar",
            stacked=True,
            figsize=(10, 6),
            color=[self.nova_palette[group] for group in NOVA_ORDER],
            edgecolor="white",
        )
        ax.set_title("NOVA Composition Within Each Nutri-Score Grade")
        ax.set_xlabel("Nutri-Score Grade")
        ax.set_ylabel("Share")
        ax.yaxis.set_major_formatter(mticker.PercentFormatter(xmax=1.0))
        ax.legend(title="NOVA Group")
        plt.tight_layout()
        plt.show()

    def plot_nutrient_distributions(self, df: pd.DataFrame, nutrient_cols: list[str]) -> None:
        n = len(nutrient_cols)
        ncols = 3
        nrows = math.ceil(n / ncols)
        fig, axes = plt.subplots(nrows, ncols, figsize=(18, 4.5 * nrows))
        axes = np.asarray(axes).ravel()
        for i, col in enumerate(nutrient_cols):
            data = df[col].dropna()
            upper = data.quantile(0.99)
            clipped = data[data <= upper]
            axes[i].hist(clipped, bins=80, density=True, color="#4C72B0", alpha=0.6, edgecolor="none")
            try:
                kde_x = np.linspace(clipped.min(), clipped.max(), 300)
                kde = stats.gaussian_kde(clipped.sample(min(5000, len(clipped)), random_state=42))
                axes[i].plot(kde_x, kde(kde_x), color="#C44E52", linewidth=1.8)
            except Exception:
                pass
            axes[i].set_title(f"{self._feature_title(col)} (per 100 g)")
            axes[i].set_xlabel("kJ / 100 g" if col == "energy_100g" else "g / 100 g")
            axes[i].set_ylabel("Density")
        for j in range(len(nutrient_cols), len(axes)):
            axes[j].set_axis_off()
        plt.suptitle("Nutrient Distributions (clipped at 99th percentile)", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

    def plot_nutrients_by_group(
        self,
        df: pd.DataFrame,
        nutrient_cols: list[str],
        group_col: str,
        order: list,
        palette: dict,
        title: str,
        chart: str = "box",
    ) -> None:
        plot_df = df[df[group_col].notna()].copy()
        plot_order = list(order)
        plot_palette = palette

        if pd.api.types.is_numeric_dtype(plot_df[group_col]) or any(not isinstance(level, str) for level in plot_order):
            plot_df[group_col] = plot_df[group_col].astype("Int64").astype(str)
            plot_order = [str(level) for level in plot_order]
            if isinstance(palette, dict):
                plot_palette = {str(key): value for key, value in palette.items()}

        n = len(nutrient_cols)
        ncols = 3
        nrows = math.ceil(n / ncols)
        fig, axes = plt.subplots(nrows, ncols, figsize=(18, 4.5 * nrows))
        axes = np.asarray(axes).ravel()
        for i, col in enumerate(nutrient_cols):
            upper = plot_df[col].quantile(0.99)
            clipped = plot_df[plot_df[col] <= upper]
            if chart == "violin":
                sns.violinplot(data=clipped, x=group_col, y=col, order=plot_order, palette=plot_palette, cut=0, linewidth=0.8, ax=axes[i])
            else:
                sns.boxplot(data=clipped, x=group_col, y=col, order=plot_order, palette=plot_palette, fliersize=1.5, linewidth=0.8, ax=axes[i])
            axes[i].set_title(self._feature_title(col))
            axes[i].set_xlabel(group_col.replace("_", " ").title())
            axes[i].set_ylabel("per 100 g")
            if group_col == "nova_group":
                axes[i].set_xticklabels([f"NOVA {level}" for level in plot_order])
        for j in range(len(nutrient_cols), len(axes)):
            axes[j].set_axis_off()
        plt.suptitle(title, fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

    def plot_correlation_matrices(self, pearson: pd.DataFrame, spearman: pd.DataFrame, nutrient_cols: list[str]) -> None:
        short_names = [col.replace("_100g", "").replace("saturated-fat", "sat.fat") for col in nutrient_cols]
        rename_map = dict(zip(nutrient_cols, short_names))
        fig, axes = plt.subplots(1, 2, figsize=(18, 7))
        mask = np.triu(np.ones_like(pearson, dtype=bool))
        sns.heatmap(
            pearson.rename(index=rename_map, columns=rename_map),
            annot=True,
            fmt=".2f",
            cmap="coolwarm",
            center=0,
            mask=mask,
            linewidths=0.4,
            ax=axes[0],
        )
        axes[0].set_title("Pearson Correlation")
        sns.heatmap(
            spearman.rename(index=rename_map, columns=rename_map),
            annot=True,
            fmt=".2f",
            cmap="coolwarm",
            center=0,
            mask=mask,
            linewidths=0.4,
            ax=axes[1],
        )
        axes[1].set_title("Spearman Correlation")
        plt.suptitle("Nutrient Correlation Matrices", fontsize=14)
        plt.tight_layout()
        plt.show()

    def plot_additives_overview(self, df: pd.DataFrame) -> None:
        if "additives_n" in df.columns:
            add_counts = df["additives_n"].dropna()
        else:
            add_counts = df["additives_tags"].dropna().apply(lambda value: len(str(value).split(",")) if pd.notna(value) else 0)

        fig, axes = plt.subplots(1, 3, figsize=(22, 5))
        axes[0].hist(add_counts.clip(upper=30), bins=31, range=(0, 30), color="#4C72B0", edgecolor="white", alpha=0.85)
        axes[0].set_title("Distribution of Additive Count per Product")
        axes[0].set_xlabel("Number of Additives")
        axes[0].set_ylabel("Products")
        axes[0].xaxis.set_major_locator(mticker.MultipleLocator(5))

        grade_df = self._grade_frame(df)
        if not grade_df.empty and "additives_n" in grade_df.columns:
            nutri_add = grade_df.groupby("nutrition_grade_fr")["additives_n"].mean().reindex(GRADE_ORDER)
            axes[1].bar(nutri_add.index.str.upper(), nutri_add.values, color=[self.grade_palette[grade] for grade in GRADE_ORDER], edgecolor="white")
            axes[1].set_title("Mean Additive Count by Nutri-Score Grade")
            axes[1].set_xlabel("Nutri-Score Grade")
            axes[1].set_ylabel("Mean Additives")
        else:
            axes[1].text(0.5, 0.5, "No Nutri-Score/additive data", ha="center", va="center")
            axes[1].set_axis_off()

        nova_df = self._nova_frame(df)
        if not nova_df.empty and "additives_n" in nova_df.columns:
            nova_add = nova_df.groupby("nova_group")["additives_n"].mean().reindex(NOVA_ORDER)
            axes[2].bar([f"NOVA {group}" for group in NOVA_ORDER], nova_add.values, color=[self.nova_palette[group] for group in NOVA_ORDER], edgecolor="white")
            axes[2].set_title("Mean Additive Count by NOVA Group")
            axes[2].set_xlabel("NOVA Group")
            axes[2].set_ylabel("Mean Additives")
        else:
            axes[2].text(0.5, 0.5, "No NOVA/additive data", ha="center", va="center")
            axes[2].set_axis_off()
        plt.tight_layout()
        plt.show()

    def plot_top_additives(self, df: pd.DataFrame) -> None:
        if "additives_tags" not in df.columns:
            print("additives_tags column not available.")
            return
        additive_series = (
            df["additives_tags"]
            .dropna()
            .str.split(",")
            .explode()
            .str.strip()
            .str.replace(r"^en:", "", regex=True)
            .replace("", np.nan)
            .dropna()
        )
        top_additives = additive_series.value_counts().head(30)
        fig, ax = plt.subplots(figsize=(10, 10))
        ax.barh(top_additives.index[::-1], top_additives.values[::-1], color=sns.color_palette("Blues_r", len(top_additives)), edgecolor="white")
        ax.set_xlabel("Frequency")
        ax.set_title("Top 30 Additives Across All Products")
        plt.tight_layout()
        plt.show()

    def plot_kruskal_summary(self, kw_df: pd.DataFrame, title: str) -> None:
        if kw_df.empty:
            print("No valid Kruskal-Wallis results were available.")
            return
        fig, ax = plt.subplots(figsize=(10, 5))
        colors = ["#d7191c" if p_value < 0.05 else "#b0b0b0" for p_value in kw_df["p-value"]]
        ax.barh(
            kw_df["feature"].str.replace("_100g", "", regex=False).str.replace("-", " ", regex=False),
            kw_df["H-statistic"],
            color=colors,
            edgecolor="white",
        )
        ax.set_xlabel("Kruskal-Wallis H-statistic")
        ax.set_title(title)
        ax.invert_yaxis()
        plt.tight_layout()
        plt.show()

    def plot_pairplot(self, df: pd.DataFrame, pair_cols: list[str] | None = None) -> None:
        pair_columns = [col for col in (pair_cols or PAIR_COLS) if col in df.columns]
        pair_df = build_pairplot_sample(df, pair_columns)
        pair_df["Nutri-Score"] = pair_df["nutrition_grade_fr"].map(
            {"a": "A-Best", "b": "B-Good", "c": "C-Fair", "d": "D-Poor", "e": "E-Worst"}
        )
        grid = sns.pairplot(
            pair_df.drop(columns="nutrition_grade_fr"),
            hue="Nutri-Score",
            palette={
                "A-Best": self.grade_palette["a"],
                "B-Good": self.grade_palette["b"],
                "C-Fair": self.grade_palette["c"],
                "D-Poor": self.grade_palette["d"],
                "E-Worst": self.grade_palette["e"],
            },
            diag_kind="kde",
            plot_kws={"alpha": 0.4, "edgecolor": "none", "s": 12},
            corner=True,
        )
        grid.figure.suptitle("Pairplot — Key Nutrients by Nutri-Score Grade (stratified sample)", y=1.01, fontsize=13)
        plt.show()

    def plot_outlier_boxplots(self, raw_df: pd.DataFrame, capped_df: pd.DataFrame, nutrient_cols: list[str]) -> None:
        fig, axes = plt.subplots(2, len(nutrient_cols), figsize=(22, 8))
        for i, col in enumerate(nutrient_cols):
            label = col.replace("_100g", "").replace("-", " ")
            raw_df[col].dropna().plot.box(ax=axes[0, i], color="steelblue", medianprops={"color": "red"})
            capped_df[col].dropna().plot.box(ax=axes[1, i], color="steelblue", medianprops={"color": "red"})
            axes[0, i].set_title(label, fontsize=8)
            axes[1, i].set_title(label, fontsize=8)
        axes[0, 0].set_ylabel("Raw")
        axes[1, 0].set_ylabel("Capped (1-99th)")
        plt.suptitle("Nutrient Distributions: Before vs After Outlier Capping", fontsize=13, y=1.01)
        plt.tight_layout()
        plt.show()

    def plot_imputation_comparison(self, capped_df: pd.DataFrame, imputed_df: pd.DataFrame, compare_cols: list[str] | None = None) -> None:
        selected_cols = [col for col in (compare_cols or COMPARE_COLS) if col in capped_df.columns]
        fig, axes = plt.subplots(len(selected_cols), 2, figsize=(16, 4 * len(selected_cols)))
        if len(selected_cols) == 1:
            axes = np.array([axes])
        for col, (ax_raw, ax_imputed) in zip(selected_cols, axes):
            raw = capped_df[col].dropna()
            imputed = imputed_df[col]
            label = self._feature_title(col)
            upper = raw.quantile(0.99)
            ax_raw.hist(raw[raw <= upper], bins=60, color="#4C72B0", alpha=0.7, edgecolor="none")
            ax_raw.set_title(f"{label} — Before Imputation")
            ax_raw.set_ylabel("Count")
            ax_imputed.hist(imputed[imputed <= upper], bins=60, color="#55A868", alpha=0.7, edgecolor="none")
            ax_imputed.set_title(f"{label} — After Imputation")
        plt.tight_layout()
        plt.show()

    def plot_geo_category_distribution(self, df: pd.DataFrame) -> None:
        country_counts = (
            df["countries_en"]
            .dropna()
            .str.split(",")
            .explode()
            .str.strip()
            .value_counts()
            .head(20)
        )
        category_counts = df["pnns_groups_1"].dropna().value_counts().head(15)
        fig, axes = plt.subplots(1, 2, figsize=(20, 7))
        axes[0].barh(country_counts.index[::-1], country_counts.values[::-1], color=sns.color_palette("Blues_r", len(country_counts)), edgecolor="white")
        axes[0].set_xlabel("Products")
        axes[0].set_title("Top 20 Countries by Product Count")
        axes[1].barh(category_counts.index[::-1], category_counts.values[::-1], color=sns.color_palette("Greens_r", len(category_counts)), edgecolor="white")
        axes[1].set_xlabel("Products")
        axes[1].set_title("Top 15 PNNS Level-1 Food Categories")
        plt.tight_layout()
        plt.show()

    def plot_pca_kmeans_preview(self, imputed_df: pd.DataFrame, nutrient_cols: list[str]) -> None:
        pca_df = imputed_df[nutrient_cols + ["nutrition_grade_fr"]].dropna(subset=["nutrition_grade_fr"])
        sample_df = (
            pca_df.groupby("nutrition_grade_fr", group_keys=False)
            .apply(lambda group: group.sample(min(2000, len(group)), random_state=42))
            .reset_index(drop=True)
        )
        x_values = sample_df[nutrient_cols].values
        y_values = sample_df["nutrition_grade_fr"].values
        x_scaled = StandardScaler().fit_transform(x_values)
        pca = PCA(n_components=min(len(nutrient_cols), 9), random_state=42)
        x_pca = pca.fit_transform(x_scaled)

        fig, axes = plt.subplots(1, 3, figsize=(22, 6))
        axes[0].bar(range(1, len(pca.explained_variance_ratio_) + 1), pca.explained_variance_ratio_ * 100, color="#4C72B0", edgecolor="white")
        axes[0].step(
            range(1, len(pca.explained_variance_ratio_) + 1),
            np.cumsum(pca.explained_variance_ratio_) * 100,
            where="mid",
            color="crimson",
            linewidth=1.8,
            label="Cumulative",
        )
        axes[0].set_xlabel("Principal Component")
        axes[0].set_ylabel("Explained Variance (%)")
        axes[0].set_title("PCA Scree Plot")
        axes[0].legend()

        for grade in GRADE_ORDER:
            mask = y_values == grade
            axes[1].scatter(x_pca[mask, 0], x_pca[mask, 1], c=[self.grade_palette[grade]], alpha=0.4, s=10, edgecolors="none", label=grade.upper())
        axes[1].set_title("PCA — PC1 vs PC2 (Nutri-Score Grade)")
        axes[1].legend(markerscale=3, fontsize=8)
        axes[1].set_xlabel("PC 1")
        axes[1].set_ylabel("PC 2")

        km_labels = KMeans(n_clusters=4, random_state=42, n_init=10).fit_predict(x_pca[:, :2])
        km_palette = sns.color_palette("tab10", 4)
        for cluster_id in range(4):
            mask = km_labels == cluster_id
            axes[2].scatter(x_pca[mask, 0], x_pca[mask, 1], c=[km_palette[cluster_id]], alpha=0.4, s=10, edgecolors="none", label=f"Cluster {cluster_id + 1}")
        axes[2].set_xlabel("PC 1")
        axes[2].set_ylabel("PC 2")
        axes[2].set_title("PCA — KMeans (k=4) Cluster Overlay")
        axes[2].legend(markerscale=3, fontsize=8)
        plt.suptitle("PCA Dimensionality Reduction and Cluster Preview", fontsize=14, y=1.01)
        plt.tight_layout()
        plt.show()

        print(f"Variance explained by PC1+PC2: {pca.explained_variance_ratio_[:2].sum() * 100:.1f}%")
