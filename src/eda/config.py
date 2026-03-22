from pathlib import Path

META_COLS = [
    "code",
    "product_name",
    "brands",
    "categories_en",
    "countries_en",
    "pnns_groups_1",
    "pnns_groups_2",
    "nutrition_grade_fr",
    "nova_group",
    "additives_n",
    "additives_tags",
    "ingredients_text",
    "ingredients_from_palm_oil_n",
    "ingredients_that_may_be_from_palm_oil_n",
]

BASE_NUTRIENT_COLS = [
    "energy_100g",
    "fat_100g",
    "saturated-fat_100g",
    "trans-fat_100g",
    "carbohydrates_100g",
    "sugars_100g",
    "fiber_100g",
    "proteins_100g",
    "salt_100g",
    "sodium_100g",
]

PAIR_COLS = [
    "energy_100g",
    "fat_100g",
    "carbohydrates_100g",
    "proteins_100g",
    "sugars_100g",
]

COMPARE_COLS = ["proteins_100g", "fiber_100g"]
GRADE_ORDER = ["a", "b", "c", "d", "e"]
NOVA_ORDER = [1, 2, 3, 4]
DEFAULT_LIGHT_DATASET_PATH = Path("dataset") / "light.csv"
FULL_DATASET_PATH = Path("dataset") / "en.openfoodfacts.org.products.csv"
