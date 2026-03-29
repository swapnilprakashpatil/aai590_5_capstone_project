from __future__ import annotations

from typing import Dict, List

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import ConfusionMatrixDisplay

from .data import ModelResult


class ModelPlotter:
    """Publication-ready plots for model evaluation and comparison."""

    COLORS = ["#2ecc71", "#3498db", "#f39c12", "#e74c3c"]
    MODEL_COLORS = ["#2980b9", "#e67e22", "#8e44ad", "#27ae60"]

    def plot_confusion_matrix(self, cm: np.ndarray, labels: List[str], title: str):
        """Display a confusion matrix with class labels."""
        fig, ax = plt.subplots(figsize=(7, 5))
        disp = ConfusionMatrixDisplay(confusion_matrix=cm, display_labels=labels)
        disp.plot(cmap="Blues", ax=ax, values_format="d")
        ax.set_title(title, fontsize=13)
        plt.tight_layout()
        plt.show()

    def plot_per_class_f1(self, result: ModelResult, labels: List[str]):
        """Horizontal bar chart of per-class F1 scores."""
        if result.per_class is None:
            return
        fig, ax = plt.subplots(figsize=(7, 3.5))
        ax.barh(result.per_class["Class"], result.per_class["F1"], color=self.COLORS)
        ax.set_xlim(0, 1)
        ax.set_xlabel("F1 Score")
        ax.set_title(f"{result.name} -- Per-Class F1", fontsize=13)
        for i, v in enumerate(result.per_class["F1"]):
            ax.text(v + 0.01, i, f"{v:.3f}", va="center", fontsize=10)
        plt.tight_layout()
        plt.show()

    def plot_mlp_loss_curve(self, loss_curve: list, title: str = "MLP Training Loss Curve"):
        """Plot the training loss curve from sklearn MLPClassifier.loss_curve_."""
        fig, ax = plt.subplots(figsize=(8, 4))
        ax.plot(range(1, len(loss_curve) + 1), loss_curve, label="Train Loss")
        ax.set_title(title, fontsize=13)
        ax.set_xlabel("Iteration")
        ax.set_ylabel("Loss")
        ax.legend()
        plt.tight_layout()
        plt.show()

    def plot_comparison_bars(self, summary_df: pd.DataFrame, metrics: List[str], title: str):
        """Grouped bar chart comparing selected metrics across models."""
        plot_df = summary_df.set_index("Model")[metrics]
        ax = plot_df.plot(kind="bar", figsize=(12, 5), width=0.7, edgecolor="white")
        ax.set_title(title, fontsize=14)
        ax.set_ylabel("Score")
        ax.set_ylim(0, 1.05)
        ax.legend(loc="lower right", fontsize=9)
        ax.tick_params(axis="x", rotation=0)
        for container in ax.containers:
            ax.bar_label(container, fmt="%.3f", fontsize=8, padding=2)
        plt.tight_layout()
        plt.show()

    def plot_metric_comparison(self, summary_df: pd.DataFrame, metric: str, title: str):
        """Single metric bar chart across models."""
        fig, ax = plt.subplots(figsize=(8, 4))
        vals = summary_df.set_index("Model")[metric]
        bars = ax.bar(vals.index, vals.values, color=self.MODEL_COLORS[:len(vals)])
        ax.set_title(title, fontsize=13)
        ax.set_ylabel(metric)
        ax.set_ylim(0, max(vals.values) * 1.15 if max(vals.values) > 0 else 1)
        for bar, v in zip(bars, vals.values):
            ax.text(bar.get_x() + bar.get_width() / 2, v + 0.005, f"{v:.4f}",
                    ha="center", va="bottom", fontsize=10)
        plt.tight_layout()
        plt.show()

    def plot_training_time(self, summary_df: pd.DataFrame):
        """Training time comparison bar chart."""
        fig, ax = plt.subplots(figsize=(8, 4))
        vals = summary_df.set_index("Model")["Train Time (s)"]
        bars = ax.bar(vals.index, vals.values, color=self.MODEL_COLORS[:len(vals)])
        ax.set_title("Training Time Comparison", fontsize=13)
        ax.set_ylabel("Seconds")
        for bar, v in zip(bars, vals.values):
            ax.text(bar.get_x() + bar.get_width() / 2, v + 0.3, f"{v:.1f}s",
                    ha="center", va="bottom", fontsize=10)
        plt.tight_layout()
        plt.show()

    def plot_per_class_f1_heatmap(self, all_results: Dict[str, ModelResult], labels: List[str]):
        """Heatmap of per-class F1 across all models."""
        rows = {}
        for name, res in all_results.items():
            if res.per_class is not None:
                rows[name] = dict(zip(res.per_class["Class"], res.per_class["F1"]))
        if not rows:
            return
        heatmap_df = pd.DataFrame(rows).T

        fig, ax = plt.subplots(figsize=(8, 4))
        im = ax.imshow(heatmap_df.values, cmap="YlGnBu", aspect="auto", vmin=0, vmax=1)
        ax.set_xticks(range(len(heatmap_df.columns)))
        ax.set_xticklabels(heatmap_df.columns)
        ax.set_yticks(range(len(heatmap_df.index)))
        ax.set_yticklabels(heatmap_df.index)
        for i in range(len(heatmap_df.index)):
            for j in range(len(heatmap_df.columns)):
                ax.text(j, i, f"{heatmap_df.values[i, j]:.3f}",
                        ha="center", va="center", fontsize=10)
        fig.colorbar(im, ax=ax, label="F1 Score")
        ax.set_title("Per-Class F1 Comparison Across Models", fontsize=13)
        plt.tight_layout()
        plt.show()
