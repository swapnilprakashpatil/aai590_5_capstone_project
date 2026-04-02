from __future__ import annotations

import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.neural_network import MLPRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.svm import OneClassSVM
from xgboost import XGBClassifier

from .evaluation import reconstruction_error, minmax_norm


def predict_nova_and_anomaly(
    X_raw: np.ndarray,
    scaler: StandardScaler,
    nova_classifier: XGBClassifier,
    autoencoder: MLPRegressor,
    ae_threshold: float,
    iso_forest: IsolationForest,
    oc_svm: OneClassSVM,
) -> pd.DataFrame:
    """
    Combined Use-Case 1 + Use-Case 2 inference.

    Parameters
    ----------
    X_raw : np.ndarray, shape (n_samples, n_features)
        Raw, unscaled feature matrix in the same column order used during training.
    scaler : StandardScaler
        Fitted scaler from Notebook 02.
    nova_classifier : XGBClassifier
        Trained NOVA tier classifier from Notebook 04.
    autoencoder : MLPRegressor
        Trained auto-associative network.
    ae_threshold : float
        Reconstruction-error threshold (95th percentile of NOVA 1 training errors).
    iso_forest : IsolationForest
        Trained Isolation Forest.
    oc_svm : OneClassSVM
        Trained One-Class SVM.

    Returns
    -------
    pd.DataFrame with columns:
        nova_pred          NOVA processing tier (1–4)
        nova_confidence    Probability of predicted NOVA class
        ae_score           Autoencoder reconstruction error
        if_score           Isolation Forest anomaly score (negated decision_function)
        svm_score          One-Class SVM anomaly score (negated decision_function)
        ensemble_score     Mean of MinMax-normalised scores — [0 = normal, 1 = anomalous]
        anomaly_votes      Number of models (0–3) that flagged this sample
        is_anomalous       True if majority vote (≥ 2/3) flags the sample
    """
    X_scaled = scaler.transform(X_raw)

    # ── Use Case 1: NOVA classification ──────────────────────────────────────
    nova_probs = nova_classifier.predict_proba(X_scaled)   # shape (n, 4)
    nova_pred  = nova_probs.argmax(axis=1) + 1             # 1-indexed NOVA group
    nova_conf  = nova_probs.max(axis=1)

    # ── Use Case 2: Anomaly scoring ───────────────────────────────────────────
    ae_s   = reconstruction_error(autoencoder, X_scaled)
    if_s   = -iso_forest.decision_function(X_scaled)
    svm_s  = -oc_svm.decision_function(X_scaled)

    ae_flag  = (ae_s > ae_threshold).astype(int)
    if_flag  = (iso_forest.predict(X_scaled) == -1).astype(int)
    svm_flag = (oc_svm.predict(X_scaled) == -1).astype(int)
    votes    = ae_flag + if_flag + svm_flag

    ens = (minmax_norm(ae_s) + minmax_norm(if_s) + minmax_norm(svm_s)) / 3.0

    return pd.DataFrame({
        "nova_pred":        nova_pred,
        "nova_confidence":  np.round(nova_conf, 4),
        "ae_score":         np.round(ae_s, 6),
        "if_score":         np.round(if_s, 6),
        "svm_score":        np.round(svm_s, 6),
        "ensemble_score":   np.round(np.clip(ens, 0, 1), 4),
        "anomaly_votes":    votes,
        "is_anomalous":     votes >= 2,
    })
