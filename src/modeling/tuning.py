from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional

import numpy as np
import optuna
from sklearn.metrics import f1_score
from xgboost import XGBClassifier

from .config import N_CLASSES, RANDOM_STATE


@dataclass
class TuningResult:
    """Container for hyperparameter tuning results."""
    study: optuna.Study
    best_params: Dict[str, Any]
    best_score: float
    baseline_score: float
    n_trials: int

    @property
    def improvement(self) -> float:
        return self.best_score - self.baseline_score

    @property
    def trial_values(self) -> List[float]:
        return [t.value for t in self.study.trials if t.value is not None]

    @property
    def best_so_far(self) -> np.ndarray:
        return np.maximum.accumulate(self.trial_values)


class XGBSearchSpace:
    """Defines the hyperparameter search space for XGBoost tuning."""

    @staticmethod
    def sample(trial: optuna.Trial) -> Dict[str, Any]:
        """Sample hyperparameters from the search space."""
        return {
            # structural
            "n_estimators": trial.suggest_int("n_estimators", 400, 1500, step=50),
            "max_depth": trial.suggest_int("max_depth", 5, 14),
            "learning_rate": trial.suggest_float("learning_rate", 0.005, 0.2, log=True),
            "max_leaves": trial.suggest_int("max_leaves", 0, 256),
            # regularization
            "min_child_weight": trial.suggest_int("min_child_weight", 1, 20),
            "reg_alpha": trial.suggest_float("reg_alpha", 1e-4, 10.0, log=True),
            "reg_lambda": trial.suggest_float("reg_lambda", 1e-4, 10.0, log=True),
            "gamma": trial.suggest_float("gamma", 0.0, 5.0),
            "max_delta_step": trial.suggest_int("max_delta_step", 0, 5),
            # stochastic
            "subsample": trial.suggest_float("subsample", 0.5, 1.0),
            "colsample_bytree": trial.suggest_float("colsample_bytree", 0.4, 1.0),
            "colsample_bylevel": trial.suggest_float("colsample_bylevel", 0.4, 1.0),
            "colsample_bynode": trial.suggest_float("colsample_bynode", 0.4, 1.0),
        }


class HyperparameterTuner:
    """Bayesian hyperparameter tuning for XGBoost with early stopping."""

    def __init__(
        self,
        n_classes: int = N_CLASSES,
        random_state: int = RANDOM_STATE,
        early_stopping_rounds: int = 50,
        search_space: Optional[XGBSearchSpace] = None,
    ):
        self.n_classes = n_classes
        self.random_state = random_state
        self.early_stopping_rounds = early_stopping_rounds
        self.search_space = search_space or XGBSearchSpace()

    def _build_model(self, params: Dict[str, Any]) -> XGBClassifier:
        """Create an XGBClassifier with fixed and sampled parameters."""
        fixed = {
            "objective": "multi:softprob",
            "num_class": self.n_classes,
            "eval_metric": "mlogloss",
            "tree_method": "hist",
            "random_state": self.random_state,
            "verbosity": 0,
            "early_stopping_rounds": self.early_stopping_rounds,
        }
        fixed.update(params)
        return XGBClassifier(**fixed)

    def _create_objective(
        self,
        X_train,
        y_train,
        X_val,
        y_val,
        sample_weight=None,
    ) -> Callable:
        """Create the Optuna objective function."""

        def objective(trial: optuna.Trial) -> float:
            params = self.search_space.sample(trial)
            model = self._build_model(params)
            model.fit(
                X_train, y_train,
                sample_weight=sample_weight,
                eval_set=[(X_val, y_val)],
                verbose=False,
            )
            y_pred = model.predict(X_val)
            return f1_score(y_val, y_pred, average="macro", zero_division=0)

        return objective

    def tune(
        self,
        X_train,
        y_train,
        X_val,
        y_val,
        sample_weight=None,
        n_trials: int = 75,
        baseline_score: float = 0.0,
    ) -> TuningResult:
        """Run Bayesian hyperparameter search and return results."""
        optuna.logging.set_verbosity(optuna.logging.WARNING)

        study = optuna.create_study(
            direction="maximize",
            sampler=optuna.samplers.TPESampler(seed=self.random_state),
            study_name="xgboost_nova_tuning",
        )

        objective = self._create_objective(
            X_train, y_train, X_val, y_val, sample_weight
        )
        study.optimize(objective, n_trials=n_trials, show_progress_bar=True)

        return TuningResult(
            study=study,
            best_params=study.best_params,
            best_score=study.best_value,
            baseline_score=baseline_score,
            n_trials=len(study.trials),
        )

    def build_tuned_model(self, best_params: Dict[str, Any]) -> XGBClassifier:
        """Build the final XGBClassifier from the best parameters."""
        return self._build_model(best_params)
