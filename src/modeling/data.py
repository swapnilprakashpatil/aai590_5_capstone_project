from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, Optional

import numpy as np
import pandas as pd


@dataclass
class ModelResult:
    """Container for a single model's evaluation results."""
    name: str
    y_pred: np.ndarray
    y_proba: Optional[np.ndarray]
    train_time: float
    inference_time: float
    metrics: Dict[str, float] = field(default_factory=dict)
    per_class: Optional[pd.DataFrame] = None
    confusion: Optional[np.ndarray] = None
    report_dict: Optional[Dict[str, Any]] = None
    history: Optional[Any] = None  # for MLP training history
