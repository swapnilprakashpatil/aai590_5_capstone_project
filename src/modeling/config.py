from __future__ import annotations

from pathlib import Path

RANDOM_STATE = 42
N_CLASSES = 4
NOVA_LABELS = ["NOVA 1", "NOVA 2", "NOVA 3", "NOVA 4"]
FEATURES_ARTIFACTS_DIRECTORY = Path("results/features")
MODEL_TRAINING_ARTIFACTS_DIRECTORY = Path("results/training")
MODEL_TUNING_ARTIFACTS_DIRECTORY = Path("results/tuning")
ANOMALY_DETECTION_ARTIFACTS_DIRECTORY = Path("results/anomaly_detection")
API_MODEL_RESULTS_DIRECTORY = Path("backend/models")
PRIMARY_METRIC = "Macro F1"
