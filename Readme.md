# NutriVision AI

## Context Aware Nutritional Assessment

Predicting food processing tiers (NOVA classes) with machine learning using Open Food Facts data, with an interactive frontend for presenting results.

## UI Demo

- Live demo: https://swapnilprakashpatil.github.io/aai590_5_capstone_project/

## Project Brief

This capstone project focuses on identifying the industrial processing level of food products from nutritional and ingredient-related features. The goal is to move beyond calories/macros and provide a clearer quality signal for users (for example, health-conscious consumers and nutrition-focused workflows).

Core idea:

- Use Open Food Facts tabular data to build and evaluate ML models for food processing tier prediction.
- Combine data analysis, feature engineering, and model experimentation in notebooks.
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

## Repository Structure

- `01_Exploratory_Data_Analysis.ipynb`: EDA and early analysis workflow.
- `dataset/`: Input data files used for analysis/modeling.
- `docs/`: Supporting documentation and project artifacts.
- `frontend/`: React frontend application.
- `requirements.txt`: Python dependencies for notebooks and data work.

## Prerequisites

- Python 3.10+ (recommended)
- Node.js 18+ and npm
- Jupyter Notebook or JupyterLab

## Dataset Setup

Source dataset:

- Kaggle snapshot: https://www.kaggle.com/datasets/openfoodfacts/world-food-facts
- Open Food Facts official export (recommended for latest fields, including NOVA): https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz

1. Open the Kaggle link above and download the dataset as a ZIP file.
2. Extract the downloaded files.
3. Copy the required TSV files into this repository's `dataset/` folder.
4. Confirm the primary file path exists before running notebooks:

```text
dataset/en.openfoodfacts.org.products.tsv
```

Optional (Kaggle CLI):

```powershell
kaggle datasets download -d openfoodfacts/world-food-facts -p dataset
```

Then unzip into `dataset/` so the TSV files are directly available there.

Optional (direct Open Food Facts download):

```powershell
Invoke-WebRequest -Uri "https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz" -OutFile "dataset/en.openfoodfacts.org.products.csv.gz"
```

Then decompress and place the extracted file in `dataset/` before loading it in notebooks.

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

4. Open `01_Exploratory_Data_Analysis.ipynb` and run cells in order.

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

## Dataset Information and Data Dictionary

### Dataset Information

- **Name:** Open Food Facts - World Food Facts
- **Source:**
  - Kaggle snapshot: https://www.kaggle.com/datasets/openfoodfacts/world-food-facts
  - Open Food Facts official export: https://world.openfoodfacts.org/data/en.openfoodfacts.org.products.csv.gz
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
