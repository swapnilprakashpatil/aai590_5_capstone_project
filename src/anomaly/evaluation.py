from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neural_network import MLPRegressor
from sklearn.svm import OneClassSVM


# ── Low-level helpers ─────────────────────────────────────────────────────────

def reconstruction_error(model: MLPRegressor, X: np.ndarray) -> np.ndarray:
    """Per-sample MSE between the original feature vector and its reconstruction."""
    X_hat = model.predict(X)
    return np.mean((X - X_hat) ** 2, axis=1)


def minmax_norm(arr: np.ndarray) -> np.ndarray:
    """Min-max normalise an array to [0, 1].  Adds a small epsilon to avoid div-by-zero."""
    lo, hi = arr.min(), arr.max()
    return (arr - lo) / (hi - lo + 1e-12)


# ── Scoring class ─────────────────────────────────────────────────────────────

class AnomalyScorer:
    """
    Score samples with trained one-class anomaly models and build an ensemble.

    All anomaly scores follow a consistent convention:
        *higher score = more anomalous*

    Attributes
    ----------
    ae_threshold : float
        Reconstruction-error threshold for the autoencoder, set to the 95th
        percentile of NOVA 1 training errors.
    """

    def __init__(self, ae_percentile: int = 95):
        self.ae_percentile = ae_percentile
        self.ae_threshold: float | None = None

    # ── Per-model scoring ─────────────────────────────────────────────────────

    def fit_ae_threshold(
        self, autoencoder: MLPRegressor, X_nova1_train: np.ndarray
    ) -> float:
        """Compute and store the autoencoder threshold from NOVA 1 training errors."""
        train_errors = reconstruction_error(autoencoder, X_nova1_train)
        self.ae_threshold = float(np.percentile(train_errors, self.ae_percentile))
        self.ae_train_errors = train_errors   # stored for downstream artifact saving
        print(
            f"Autoencoder anomaly threshold ({self.ae_percentile}th pct of NOVA 1 "
            f"train errors): {self.ae_threshold:.6f}"
        )
        return self.ae_threshold

    def score_autoencoder(
        self, autoencoder: MLPRegressor, X: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Return (scores, binary_flags) for the autoencoder.

        Requires ``fit_ae_threshold`` to have been called first.
        """
        if self.ae_threshold is None:
            raise RuntimeError("Call fit_ae_threshold() before score_autoencoder().")
        scores = reconstruction_error(autoencoder, X)
        flags = (scores > self.ae_threshold).astype(int)
        self._print_report("Autoencoder", flags)
        return scores, flags

    def score_isolation_forest(
        self, iso_forest: IsolationForest, X: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Return (scores, binary_flags) for the Isolation Forest.

        Score is the negated ``decision_function`` so that higher = more anomalous.
        """
        scores = -iso_forest.decision_function(X)
        flags = (iso_forest.predict(X) == -1).astype(int)
        self._print_report("Isolation Forest", flags)
        return scores, flags

    def score_one_class_svm(
        self, oc_svm: OneClassSVM, X: np.ndarray
    ) -> tuple[np.ndarray, np.ndarray]:
        """
        Return (scores, binary_flags) for the One-Class SVM.

        Score is the negated ``decision_function`` so that higher = more anomalous.
        """
        scores = -oc_svm.decision_function(X)
        flags = (oc_svm.predict(X) == -1).astype(int)
        self._print_report("One-Class SVM", flags)
        return scores, flags

    # ── Ensemble ──────────────────────────────────────────────────────────────

    def build_ensemble(
        self,
        ae_anomalies: np.ndarray,
        if_anomalies: np.ndarray,
        svm_anomalies: np.ndarray,
        ae_scores: np.ndarray,
        if_scores: np.ndarray,
        svm_scores: np.ndarray,
        y_test_0indexed: np.ndarray,
        min_votes: int = 2,
    ) -> pd.DataFrame:
        """
        Combine three binary flag arrays with a majority-vote ensemble and a
        continuous ensemble score built from MinMax-normalised model scores.

        Parameters
        ----------
        *_anomalies : binary flags (0/1) from each model
        *_scores    : raw anomaly scores (higher = more anomalous)
        y_test_0indexed : 0-indexed NOVA group labels (0 = NOVA 1 … 3 = NOVA 4)
        min_votes   : minimum number of agreeing models to trigger the ensemble flag

        Returns
        -------
        pd.DataFrame with columns: Autoencoder, Isolation Forest, One-Class SVM,
            nova_group, votes, ensemble_anomaly, ae_score_norm, if_score_norm,
            svm_score_norm, ensemble_score
        """
        df = pd.DataFrame({
            "Autoencoder":      ae_anomalies,
            "Isolation Forest": if_anomalies,
            "One-Class SVM":    svm_anomalies,
            "nova_group":       y_test_0indexed + 1,
        })
        df["votes"]            = df[["Autoencoder", "Isolation Forest", "One-Class SVM"]].sum(axis=1)
        df["ensemble_anomaly"] = (df["votes"] >= min_votes).astype(int)
        df["ae_score_norm"]    = minmax_norm(ae_scores)
        df["if_score_norm"]    = minmax_norm(if_scores)
        df["svm_score_norm"]   = minmax_norm(svm_scores)
        df["ensemble_score"]   = (
            df["ae_score_norm"] + df["if_score_norm"] + df["svm_score_norm"]
        ) / 3.0

        self._print_ensemble_report(df)
        return df

    # ── Helpers ───────────────────────────────────────────────────────────────

    @staticmethod
    def _print_report(name: str, flags: np.ndarray) -> None:
        print(
            f"{name} — anomalies flagged: {flags.sum():,} / {len(flags):,}  "
            f"({flags.mean() * 100:.1f}%)"
        )

    @staticmethod
    def _print_ensemble_report(df: pd.DataFrame) -> None:
        print("\nEnsemble anomaly rates by NOVA group (majority vote ≥ 2/3):")
        for g in range(1, 5):
            sub  = df[df["nova_group"] == g]
            rate = sub["ensemble_anomaly"].mean() * 100
            n    = sub["ensemble_anomaly"].sum()
            print(f"  NOVA {g}: {rate:5.1f}%  ({n:,} / {len(sub):,})")
        print(f"\nOverall ensemble anomaly rate: {df['ensemble_anomaly'].mean() * 100:.1f}%")
