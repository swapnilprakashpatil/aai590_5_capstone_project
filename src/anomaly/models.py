from __future__ import annotations

import time
from typing import Optional

import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.neural_network import MLPRegressor
from sklearn.svm import OneClassSVM


class AnomalyTrainer:
    """Train the three one-class anomaly detectors on a whole-food (NOVA 1) baseline."""

    def __init__(self, random_state: int = 42):
        self.random_state = random_state

    def train_autoencoder(
        self,
        X_nova1: np.ndarray,
        hidden_layer_sizes: tuple = (64, 32, 8, 32, 64),
        max_iter: int = 500,
        verbose: bool = False,
    ) -> MLPRegressor:
        """
        Fit an auto-associative MLPRegressor (autoencoder) on NOVA 1 data.

        The target equals the input — the network learns to reconstruct whole-food
        nutritional profiles through a compressed bottleneck.  Reconstruction error
        on unseen samples is then used as an anomaly score.
        """
        print("Training Autoencoder on NOVA 1 samples …")
        t0 = time.time()

        model = MLPRegressor(
            hidden_layer_sizes=hidden_layer_sizes,
            activation="relu",
            solver="adam",
            learning_rate_init=1e-3,
            max_iter=max_iter,
            tol=1e-5,
            n_iter_no_change=20,
            early_stopping=True,
            validation_fraction=0.1,
            random_state=self.random_state,
            verbose=verbose,
        )
        model.fit(X_nova1, X_nova1)

        print(
            f"Done in {time.time() - t0:.1f}s  |  "
            f"iterations: {model.n_iter_}  |  "
            f"best val loss: {model.best_validation_score_:.6f}"
        )
        return model

    def train_isolation_forest(
        self,
        X_nova1: np.ndarray,
        n_estimators: int = 300,
        contamination: float = 0.05,
        n_jobs: int = -1,
    ) -> IsolationForest:
        """
        Fit an Isolation Forest on NOVA 1 data.

        ``contamination`` is the expected fraction of outliers within the NOVA 1
        training set — controls how tightly the inlier boundary is drawn.
        """
        print("Training Isolation Forest on NOVA 1 samples …")
        t0 = time.time()

        model = IsolationForest(
            n_estimators=n_estimators,
            max_samples="auto",
            contamination=contamination,
            max_features=1.0,
            bootstrap=False,
            n_jobs=n_jobs,
            random_state=self.random_state,
        )
        model.fit(X_nova1)

        print(
            f"Done in {time.time() - t0:.1f}s  |  "
            f"n_estimators: {model.n_estimators}  |  "
            f"max_samples per tree: {model.max_samples_:,}"
        )
        return model

    def train_one_class_svm(
        self,
        X_nova1: np.ndarray,
        nu: float = 0.05,
        kernel: str = "rbf",
        gamma: str = "scale",
    ) -> OneClassSVM:
        """
        Fit a One-Class SVM on NOVA 1 data.

        ``nu`` is an upper bound on the fraction of training outliers and a lower bound
        on the fraction of support vectors — controls boundary hardness.
        """
        print("Training One-Class SVM on NOVA 1 samples …")
        t0 = time.time()

        model = OneClassSVM(kernel=kernel, nu=nu, gamma=gamma)
        model.fit(X_nova1)

        print(
            f"Done in {time.time() - t0:.1f}s  |  "
            f"kernel: {model.kernel}  |  nu: {model.nu}  |  gamma: {model.gamma}  |  "
            f"support vectors: {model.support_vectors_.shape[0]:,}"
        )
        return model
