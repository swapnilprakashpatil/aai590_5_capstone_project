from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    log_loss,
    precision_score,
    recall_score,
    roc_auc_score,
)

from .data import ModelResult


class MetricsEvaluator:
    """Compute a standard set of classification metrics."""

    def __init__(self, labels: List[str], n_classes: int):
        self.labels = labels
        self.n_classes = n_classes

    def evaluate(self, y_true, y_pred, y_proba=None) -> tuple:
        """Return summary metrics dict, per-class dataframe, confusion matrix, and report dict."""
        metrics = {
            "Accuracy": accuracy_score(y_true, y_pred),
            "Balanced Accuracy": balanced_accuracy_score(y_true, y_pred),
            "Macro Precision": precision_score(y_true, y_pred, average="macro", zero_division=0),
            "Macro Recall": recall_score(y_true, y_pred, average="macro", zero_division=0),
            "Macro F1": f1_score(y_true, y_pred, average="macro", zero_division=0),
            "Weighted Precision": precision_score(y_true, y_pred, average="weighted", zero_division=0),
            "Weighted Recall": recall_score(y_true, y_pred, average="weighted", zero_division=0),
            "Weighted F1": f1_score(y_true, y_pred, average="weighted", zero_division=0),
        }

        if y_proba is not None:
            metrics["Log Loss"] = log_loss(y_true, y_proba)
            try:
                metrics["ROC-AUC (OVR)"] = roc_auc_score(
                    y_true, y_proba, multi_class="ovr", average="macro"
                )
            except ValueError:
                metrics["ROC-AUC (OVR)"] = np.nan

        cm = confusion_matrix(y_true, y_pred)
        report = classification_report(
            y_true, y_pred, target_names=self.labels, output_dict=True, zero_division=0
        )

        per_class_rows = []
        for label in self.labels:
            per_class_rows.append({
                "Class": label,
                "Precision": report[label]["precision"],
                "Recall": report[label]["recall"],
                "F1": report[label]["f1-score"],
                "Support": report[label]["support"],
            })
        per_class_df = pd.DataFrame(per_class_rows)

        return metrics, per_class_df, cm, report


class ModelRunner:
    """Fit a model, predict, collect metrics, and return a ModelResult."""

    def __init__(self, evaluator: MetricsEvaluator):
        self.evaluator = evaluator

    def run(
        self,
        name: str,
        model,
        X_train,
        y_train,
        X_val,
        y_val,
        fit_kwargs: Optional[Dict] = None,
    ) -> ModelResult:
        """Train and evaluate a sklearn-compatible model."""
        fit_kwargs = fit_kwargs or {}

        # train
        t0 = time.perf_counter()
        model.fit(X_train, y_train, **fit_kwargs)
        train_time = time.perf_counter() - t0

        # predict
        t0 = time.perf_counter()
        y_pred = model.predict(X_val)
        inference_time = time.perf_counter() - t0

        # probabilities
        y_proba = None
        if hasattr(model, "predict_proba"):
            y_proba = model.predict_proba(X_val)

        # evaluate
        metrics, per_class, cm, report = self.evaluator.evaluate(y_val, y_pred, y_proba)
        metrics["Train Time (s)"] = round(train_time, 2)
        metrics["Inference Time (s)"] = round(inference_time, 4)

        return ModelResult(
            name=name,
            y_pred=y_pred,
            y_proba=y_proba,
            train_time=train_time,
            inference_time=inference_time,
            metrics=metrics,
            per_class=per_class,
            confusion=cm,
            report_dict=report,
        )
