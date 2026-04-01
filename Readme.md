# NutriVision AI

## Context Aware Nutritional Assessment

Predicting food processing tiers (NOVA classes) with machine learning using Open Food Facts data, with an interactive frontend for presenting results.

## UI Demo

- Live demo: https://swapnilprakashpatil.github.io/aai590_5_capstone_project/

## Project Brief

This capstone project focuses on identifying the industrial processing level of food products from nutritional and ingredient-related features. The goal is to move beyond calories/macros and provide a clearer quality signal for users (for example, health-conscious consumers and nutrition-focused workflows).

Core idea:

- Use Open Food Facts tabular data to build and evaluate ML models for food processing tier (NOVA group) prediction.
- Follow a structured pipeline: EDA, feature engineering, multi-model comparison, hyperparameter tuning, and SHAP explainability.
- Present outputs through a React + Vite frontend prototype.

## Team and Academic Details

- **Team members:**
  - Jamshed Nabizada
  - Swapnil Patil
- **Professor:** Anna Marbut
- **Course:** AAI-590 Capstone Project
- **Program:** Master of Science in Applied Artificial Intelligence
- **University:** University of San Diego
- **School:** Shiley Marcos School of Engineering

## Notebook Pipeline

The project follows a four-notebook pipeline, each building on artifacts from the previous step:

| # | Notebook | Purpose |
|---|----------|---------|
| 1 | `01_Exploratory_Data_Analysis.ipynb` | Data quality assessment, target/feature distributions, correlation analysis, outlier detection, missing-data imputation, and cleaned parquet export. |
| 2 | `02_Feature_Engineering_and_Model_Preperation.ipynb` | Feature selection, engineered ratio features (e.g. sugar/fiber, fat/protein, additives/energy), train/val/test split, scaling, and XGBoost baseline. |
| 3 | `03_Model_Training_and_Evaluation.ipynb` | Comparative evaluation of Random Forest, XGBoost, MLP, and LightGBM under consistent metrics; XGBoost selected as best candidate (Macro F1 = 0.856). |
| 4 | `04_Hyperparameter_Tuning_and_Final_Evaluation.ipynb` | Bayesian hyperparameter tuning with Optuna, held-out test evaluation, and SHAP explainability analysis. |

Run notebooks in order — each one saves artifacts consumed by the next.

## Key Results

| Metric | Baseline (Validation) | Tuned (Test) |
|--------|-----------------------|--------------|
| Macro F1 | 0.856 | 0.857 |
| Balanced Accuracy | 0.882 | 0.882 |
| Weighted F1 | 0.875 | 0.878 |
| ROC-AUC (OVR) | 0.974 | 0.974 |

**Top SHAP features (overall):** added_sugars_100g, additives_n, additives_per_energy, salt_100g, proteins_100g.

NOVA 3 (processed foods) remains the most challenging class across all models, primarily confused with NOVA 4.

## Repository Structure

- `01_Exploratory_Data_Analysis.ipynb` – EDA and data cleaning.
- `02_Feature_Engineering_and_Model_Preperation.ipynb` – Feature engineering, splitting, and baseline model.
- `03_Model_Training_and_Evaluation.ipynb` – Multi-model comparison and selection.
- `04_Hyperparameter_Tuning_and_Final_Evaluation.ipynb` – Tuning, test evaluation, and SHAP analysis.
- `dataset/` – Raw and processed data files.
- `models/` – Saved model artifacts, metrics, SHAP importance, and hyperparameters.
- `src/eda/` – Reusable EDA modules (data loading, plotting, analysis helpers).
- `src/modeling/` – Reusable modeling modules (evaluation, tuning, plotting helpers).
- `scripts/` – Utility scripts (light dataset creation, GitHub project import).
- `docs/` – Supporting documentation and project artifacts.
- `frontend/` – React + Vite frontend application.
- `requirements.txt` – Python dependencies for notebooks and data work.

## Prerequisites

- Python 3.10+ (recommended)
- Node.js 18+ and npm
- Jupyter Notebook or JupyterLab

## Dataset Setup

Source dataset:

- Open Food Facts official export: https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz

1. Download the dataset:

```powershell
Invoke-WebRequest -Uri "https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz" -OutFile "dataset/en.openfoodfacts.org.products.csv.gz"
```

2. Decompress and place the extracted file in `dataset/`.
3. Confirm the primary file path exists before running notebooks:

```text
dataset/en.openfoodfacts.org.products.tsv
```

## Using the Notebooks

1. Create and activate a Python virtual environment (optional but recommended):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install Python dependencies:

```powershell
pip install -r requirements.txt
```

3. Start Jupyter:

```powershell
jupyter notebook
```

4. Open notebooks in order, starting with `01_Exploratory_Data_Analysis.ipynb`, and run cells sequentially. Each notebook saves artifacts (cleaned data, splits, models, metrics) consumed by the next.

Notes:

- Keep data files in `dataset/` so notebook paths remain valid.
- If kernel/package issues occur, confirm the notebook is using the same `.venv` environment where dependencies were installed.

## Running the Frontend

Hosted UI demo:

- https://swapnilprakashpatil.github.io/aai590_5_capstone_project/

From the `frontend/` folder:

1. Install dependencies:

```powershell
npm install
```

2. Start the development server:

```powershell
npm run dev
```

3. Open `http://localhost:3000`.

Alternative launch scripts:

- Windows PowerShell: `./start.ps1`
- macOS/Linux: `bash start.sh`

Additional frontend commands:

```powershell
npm run build
npm run preview
```

## Running the backend 

Install the following: 
```powershell
pip install fastapi uvicorn xgboost pandas scikit-learn joblib pillow python-multipart
```

Launch API
```powershell
python main.py
```


## Dataset Information and Data Dictionary

### Dataset Information

- **Name:** Open Food Facts - World Food Facts
- **Source:** https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
- **Primary file used in this project:** `dataset/en.openfoodfacts.org.products.tsv`
- **Format:** Tab-separated values (TSV)
- **Granularity:** One row per product
- **Primary objective in this project:** Predict food processing tiers (NOVA classes) from nutrition and ingredient-related signals

### Data Dictionary (Key Fields)

The full dataset contains many columns; this project primarily uses the fields below.

| Field                | Type          | Description                                                             |
| -------------------- | ------------- | ----------------------------------------------------------------------- |
| `code`               | string        | Product barcode/identifier.                                             |
| `product_name`       | string        | Human-readable product name.                                            |
| `brands`             | string        | Brand name(s) associated with the product.                              |
| `categories`         | string        | Product category labels (often comma-separated).                        |
| `ingredients_text`   | string        | Raw ingredient list text from package labeling.                         |
| `additives_n`        | numeric       | Count of detected additives in the product.                             |
| `nova_group`         | numeric (1-4) | NOVA processing class label used as the target variable when available. |
| `energy_100g`        | numeric       | Energy per 100g (typically kJ in Open Food Facts exports).              |
| `fat_100g`           | numeric       | Total fat per 100g.                                                     |
| `saturated-fat_100g` | numeric       | Saturated fat per 100g.                                                 |
| `carbohydrates_100g` | numeric       | Total carbohydrates per 100g.                                           |
| `sugars_100g`        | numeric       | Sugars per 100g.                                                        |
| `fiber_100g`         | numeric       | Dietary fiber per 100g.                                                 |
| `proteins_100g`      | numeric       | Protein per 100g.                                                       |
| `salt_100g`          | numeric       | Salt per 100g.                                                          |
| `sodium_100g`        | numeric       | Sodium per 100g (sometimes derived from salt).                          |

Notes:

- Column availability and completeness can vary by product and country.
- Missing values are expected and should be handled during preprocessing.
- Some fields may appear with minor naming variations depending on dataset version.
- `nova_group` availability depends on the dataset version/source. If missing in older snapshots, use the latest official Open Food Facts export.
