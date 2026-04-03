from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from sklearn.neural_network import MLPRegressor

from .config import MODEL_COLORS, NOVA_COLORS


class AnomalyPlotter:
    """Publication-ready plots for anomaly detection results."""

    nova_colors  = NOVA_COLORS
    model_colors = MODEL_COLORS

    # Baseline exploration

    def plot_feature_distributions(
        self,
        X_test_scaled: np.ndarray,
        y_test_0indexed: np.ndarray,
        feature_names: List[str],
        n_cols: int = 5,
    ) -> None:
        """
        Grid of per-feature histograms with NOVA groups overlaid.

        Highlights which features best separate the four NOVA groups — the
        autoencoder and SVM learn the green (NOVA 1) distribution as 'normal'.
        """
        df = pd.DataFrame(X_test_scaled, columns=feature_names)
        df["nova_group"] = y_test_0indexed + 1

        n_rows = int(np.ceil(len(feature_names) / n_cols))
        fig, axes = plt.subplots(n_rows, n_cols, figsize=(18, n_rows * 3))
        axes = axes.flatten()

        for i, feat in enumerate(feature_names):
            ax = axes[i]
            for g in range(1, 5):
                vals = df[df["nova_group"] == g][feat]
                ax.hist(vals, bins=30, alpha=0.5, label=f"NOVA {g}",
                        color=self.nova_colors[g], density=True)
            ax.set_title(feat, fontsize=9, pad=3)
            ax.tick_params(labelsize=7)

        handles = [mpatches.Patch(color=self.nova_colors[g], label=f"NOVA {g}")
                   for g in range(1, 5)]
        axes[0].legend(handles=handles, fontsize=7)

        for j in range(len(feature_names), len(axes)):
            axes[j].set_visible(False)

        plt.suptitle("Scaled Feature Distributions by NOVA Group (Test Set)", fontsize=13, y=1.01)
        plt.tight_layout()
        plt.show()

    # Autoencoder plots

    def plot_loss_curve(self, autoencoder: MLPRegressor) -> None:
        """Training loss curve from ``MLPRegressor.loss_curve_``."""
        fig, ax = plt.subplots(figsize=(9, 4))
        ax.plot(autoencoder.loss_curve_, color=self.model_colors["Autoencoder"],
                linewidth=2, label="Train Loss")
        ax.set_xlabel("Iteration")
        ax.set_ylabel("MSE Loss")
        ax.set_title("Autoencoder Training Loss Curve (NOVA 1 only)", fontsize=12)
        ax.legend()
        plt.tight_layout()
        plt.show()

    def plot_score_violin_and_rate(
        self,
        scores: np.ndarray,
        anomalies: np.ndarray,
        y_test_0indexed: np.ndarray,
        title_prefix: str,
        score_ylabel: str,
        threshold: float | None = None,
    ) -> None:
        """
        Side-by-side violin of anomaly scores by NOVA group and a bar chart of
        anomaly rates per group.  Reused for all three individual models.
        """
        fig, axes = plt.subplots(1, 2, figsize=(14, 5))

        group_scores = [scores[y_test_0indexed == g] for g in range(4)]
        vp = axes[0].violinplot(group_scores, positions=range(1, 5),
                                showmedians=True, showextrema=True)
        for i, pc in enumerate(vp["bodies"]):
            pc.set_facecolor(list(self.nova_colors.values())[i])
            pc.set_alpha(0.7)

        thr_val = threshold if threshold is not None else 0.0
        axes[0].axhline(thr_val, color="red", linestyle="--", linewidth=1.8,
                        label=f"Threshold = {thr_val:.5f}" if threshold is not None
                              else "Threshold (0)")
        axes[0].set_xticks(range(1, 5))
        axes[0].set_xticklabels(
            ["NOVA 1\n(Whole)", "NOVA 2\n(Culinary)",
             "NOVA 3\n(Processed)", "NOVA 4\n(Ultra-Proc.)"])
        axes[0].set_ylabel(score_ylabel)
        axes[0].set_title(f"{title_prefix}: Score by NOVA Group")
        axes[0].legend(fontsize=9)

        rates = [anomalies[y_test_0indexed == g].mean() * 100 for g in range(4)]
        bars = axes[1].bar([f"NOVA {g}" for g in range(1, 5)], rates,
                           color=list(self.nova_colors.values()), edgecolor="white", width=0.6)
        for bar, r in zip(bars, rates):
            axes[1].text(bar.get_x() + bar.get_width() / 2, r + 0.4, f"{r:.1f}%",
                         ha="center", va="bottom", fontsize=10, fontweight="bold")
        axes[1].set_ylabel("Anomaly Rate (%)")
        axes[1].set_title(f"{title_prefix}: Anomaly Rate by NOVA Group")
        axes[1].set_ylim(0, max(rates) * 1.25 + 1)

        plt.suptitle(f"{title_prefix} Anomaly Detection Results", fontsize=13)
        plt.tight_layout()
        plt.show()

    def plot_per_feature_reconstruction_error(
        self,
        autoencoder: MLPRegressor,
        X_test_scaled: np.ndarray,
        y_test_0indexed: np.ndarray,
        feature_names: List[str],
    ) -> None:
        """
        Grouped bar chart comparing per-feature MSE reconstruction error across
        NOVA groups.  High error on a feature = the autoencoder finds it most
        'surprising' for that group.
        """
        feat_errors: Dict[str, np.ndarray] = {}
        for g, label in enumerate(["NOVA 1", "NOVA 2", "NOVA 3", "NOVA 4"]):
            X_sub = X_test_scaled[y_test_0indexed == g]
            X_hat = autoencoder.predict(X_sub)
            feat_errors[label] = np.mean((X_sub - X_hat) ** 2, axis=0)

        feat_err_df = pd.DataFrame(feat_errors, index=feature_names)

        fig, ax = plt.subplots(figsize=(14, 5))
        x = np.arange(len(feature_names))
        width = 0.22
        colors_list = list(self.nova_colors.values())

        for i, (label, color) in enumerate(zip(feat_err_df.columns, colors_list)):
            ax.bar(x + (i - 1.5) * width, feat_err_df[label].values, width,
                   label=label, color=color, alpha=0.8, edgecolor="white")

        ax.set_xticks(x)
        ax.set_xticklabels(feature_names, rotation=45, ha="right", fontsize=9)
        ax.set_ylabel("Mean Squared Reconstruction Error")
        ax.set_title("Autoencoder: Per-Feature Reconstruction Error by NOVA Group", fontsize=12)
        ax.legend(fontsize=9)
        ax.axhline(0, color="gray", linewidth=0.7)
        plt.tight_layout()
        plt.show()

        print("Top 5 features with highest reconstruction error for NOVA 4:")
        print(feat_err_df["NOVA 4"].sort_values(ascending=False).head().to_string())

    # Ensemble plots

    def plot_cross_model_anomaly_rates(
        self,
        all_flags: List[np.ndarray],
        y_test_0indexed: np.ndarray,
        model_names: List[str] | None = None,
    ) -> None:
        """
        Grouped bar chart comparing anomaly rates across all models and the ensemble
        for each NOVA group.
        """
        if model_names is None:
            model_names = [
                "Autoencoder", "Isolation\nForest", "One-Class\nSVM",
                "Ensemble\n(Majority Vote)",
            ]
        bar_colors = [
            self.model_colors["Autoencoder"],
            self.model_colors["Isolation Forest"],
            self.model_colors["One-Class SVM"],
            self.model_colors["Ensemble"],
        ]
        rate_mat = np.array([
            [flags[y_test_0indexed == g].mean() * 100 for g in range(4)]
            for flags in all_flags
        ]).T  # shape (4 nova groups, n_models)

        fig, ax = plt.subplots(figsize=(13, 5))
        x     = np.arange(4)
        width = 0.2

        for i, (mname, color) in enumerate(zip(model_names, bar_colors)):
            offsets = x + (i - 1.5) * width
            bars = ax.bar(offsets, rate_mat[:, i], width,
                          label=mname, color=color, alpha=0.85, edgecolor="white")
            for bar, v in zip(bars, rate_mat[:, i]):
                if v > 0.5:
                    ax.text(bar.get_x() + bar.get_width() / 2, bar.get_height() + 0.5,
                            f"{v:.0f}%", ha="center", va="bottom", fontsize=7.5)

        ax.set_xticks(x)
        ax.set_xticklabels(
            ["NOVA 1\n(Whole Foods)", "NOVA 2\n(Culinary Ingred.)",
             "NOVA 3\n(Processed)", "NOVA 4\n(Ultra-Processed)"])
        ax.set_ylabel("Anomaly Rate (%)")
        ax.set_title("Anomaly Rate by NOVA Group — All Models and Ensemble", fontsize=13)
        ax.legend(ncol=2, fontsize=9, loc="upper left")
        plt.tight_layout()
        plt.show()

    def plot_jaccard_heatmap(
        self,
        binary_flags: List[np.ndarray],
        model_labels: List[str] | None = None,
    ) -> None:
        """
        Heatmap of pairwise Jaccard similarity between model anomaly flags.
        Jaccard(A, B) = |A ∩ B| / |A ∪ B|.
        """
        if model_labels is None:
            model_labels = ["Autoencoder", "Isolation\nForest", "One-Class\nSVM"]

        n_m = len(binary_flags)
        jaccard_mat = np.zeros((n_m, n_m))
        for i in range(n_m):
            for j in range(n_m):
                if i == j:
                    jaccard_mat[i, j] = 1.0
                else:
                    both   = (binary_flags[i] & binary_flags[j]).sum()
                    either = (binary_flags[i] | binary_flags[j]).sum()
                    jaccard_mat[i, j] = both / either if either > 0 else 0.0

        fig, ax = plt.subplots(figsize=(6, 5))
        im = ax.imshow(jaccard_mat, cmap="Blues", vmin=0, vmax=1)
        ax.set_xticks(range(n_m)); ax.set_xticklabels(model_labels, fontsize=10)
        ax.set_yticks(range(n_m)); ax.set_yticklabels(model_labels, fontsize=10)
        for i in range(n_m):
            for j in range(n_m):
                ax.text(j, i, f"{jaccard_mat[i, j]:.2f}",
                        ha="center", va="center", fontsize=13, fontweight="bold")
        fig.colorbar(im, ax=ax, label="Jaccard Similarity")
        ax.set_title("Anomaly Flag Agreement Between Models (Jaccard)", fontsize=12)
        plt.tight_layout()
        plt.show()

        for i in range(n_m):
            for j in range(i + 1, n_m):
                overlap = (binary_flags[i] & binary_flags[j]).sum()
                print(
                    f"  {model_labels[i].replace(chr(10), ' ')} ∩ "
                    f"{model_labels[j].replace(chr(10), ' ')}: "
                    f"{overlap:,} samples flagged by both"
                )

    def plot_ensemble_score_distribution(
        self,
        flags_df: pd.DataFrame,
        y_test_0indexed: np.ndarray,
    ) -> None:
        """
        Overlapping histogram of the continuous ensemble score split by NOVA group.
        """
        fig, ax = plt.subplots(figsize=(10, 5))

        for g in range(4):
            mask   = (y_test_0indexed == g)
            scores = flags_df.loc[mask, "ensemble_score"]
            ax.hist(scores, bins=40, alpha=0.6, label=f"NOVA {g + 1}",
                    color=self.nova_colors[g + 1], density=True)

        thresh_candidates = flags_df.loc[flags_df["ensemble_anomaly"] == 1, "ensemble_score"]
        if len(thresh_candidates) > 0:
            ens_thresh = thresh_candidates.min()
            ax.axvline(ens_thresh, color="black", linestyle="--", linewidth=1.8,
                       label=f"Ensemble threshold ≈ {ens_thresh:.3f}")

        ax.set_xlabel("Ensemble Anomaly Score  (0 = Normal · 1 = Highly Anomalous)")
        ax.set_ylabel("Density")
        ax.set_title("Ensemble Anomaly Score Distribution by NOVA Group", fontsize=12)
        ax.legend(fontsize=10)
        plt.tight_layout()
        plt.show()

    # Analysis plots

    def plot_feature_profile(
        self,
        X_test_df: pd.DataFrame,
        top_anomalies: pd.DataFrame,
        feature_names: List[str],
    ) -> None:
        """
        Grouped bar chart comparing mean feature values for NOVA 1 baseline,
        the top anomalies, and NOVA 4 ultra-processed products.
        """
        nova1_mean = X_test_df[X_test_df["nova_group"] == 1][feature_names].mean()
        top_mean   = top_anomalies[feature_names].mean()
        nova4_mean = X_test_df[X_test_df["nova_group"] == 4][feature_names].mean()

        profile_df = pd.DataFrame({
            "NOVA 1 — Whole Foods": nova1_mean,
            "Top Anomalies":        top_mean,
            "NOVA 4 — Ultra-Proc.": nova4_mean,
        }, index=feature_names).T

        fig, ax = plt.subplots(figsize=(15, 5))
        x     = np.arange(len(feature_names))
        width = 0.26
        p_colors = ["#2ecc71", "#8e44ad", "#e74c3c"]

        for i, (label, color) in enumerate(zip(profile_df.index, p_colors)):
            ax.bar(x + (i - 1) * width, profile_df.loc[label].values, width,
                   label=label, color=color, alpha=0.78, edgecolor="white")

        ax.set_xticks(x)
        ax.set_xticklabels(feature_names, rotation=45, ha="right", fontsize=9)
        ax.set_ylabel("Mean Scaled Feature Value")
        ax.set_title("Mean Feature Profile: NOVA 1 vs. Top Anomalies vs. NOVA 4", fontsize=12)
        ax.legend(fontsize=10)
        ax.axhline(0, color="gray", linewidth=0.8, linestyle="--")
        plt.tight_layout()
        plt.show()

        delta_df = pd.DataFrame({
            "Anomaly − NOVA1": top_mean    - nova1_mean,
            "NOVA4  − NOVA1":  nova4_mean  - nova1_mean,
        }).round(3)
        print("\nTop 5 features by absolute deviation (Anomaly − NOVA 1):")
        from IPython.display import display  # localised import — runs in notebook context only
        display(delta_df.reindex(
            delta_df["Anomaly − NOVA1"].abs().sort_values(ascending=False).index
        ).head())

    def plot_confidence_vs_anomaly_score(
        self,
        combined_df: pd.DataFrame,
    ) -> None:
        """
        Scatter plot of NOVA classifier confidence vs. ensemble anomaly score,
        coloured by true NOVA group.
        """
        fig, ax = plt.subplots(figsize=(9, 6))

        for g in range(1, 5):
            mask = combined_df["true_nova"] == g
            ax.scatter(
                combined_df.loc[mask, "nova_confidence"],
                combined_df.loc[mask, "ensemble_score"],
                c=self.nova_colors[g], alpha=0.25, s=10,
                label=f"NOVA {g}", rasterized=True,
            )

        ax.set_xlabel("NOVA Classifier Confidence (predicted class probability)")
        ax.set_ylabel("Ensemble Anomaly Score (0 = Normal · 1 = Anomalous)")
        ax.set_title("NOVA Confidence vs. Ensemble Anomaly Score", fontsize=12)

        handles = [mpatches.Patch(color=self.nova_colors[g], label=f"NOVA {g}")
                   for g in range(1, 5)]
        ax.legend(handles=handles, fontsize=10)
        plt.tight_layout()
        plt.show()
