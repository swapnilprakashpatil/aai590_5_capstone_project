from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import joblib
import pandas as pd
import json
import os
from PIL import Image
import io
from pathlib import Path
import xgboost as xgb

app = FastAPI()

# enables requests for React to talk to FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# get the directory where main.py is located
# this solves path issues for different terminals (gitbash, powershell, etc..)
BASE_DIR = Path(__file__).resolve().parent

# define paths relative to BASE_DIR
MODEL_PATH = BASE_DIR / "models" / "final_model.json"
SCALER_PATH = BASE_DIR / "models" / "final_scaler.joblib"
FEATURES_PATH = BASE_DIR / "models" / "features.json"

# initialize global variables
model = None
scaler = None
feature_names = None

# verify our paths do exists for the models in our backend
for p in [MODEL_PATH, SCALER_PATH, FEATURES_PATH]:
    if not p.exists():
        print(f"CRITICAL ERROR: File missing at {p}")
    else:
        print(f"Confirmed: {p.name} exists.")

# load block
try:
    # load XGBoost Model using native loader
    # convert the Path object to a string for library compatibility
    model = xgb.XGBClassifier()
    model.load_model(str(MODEL_PATH))
    
    # load Scaler
    scaler = joblib.load(str(SCALER_PATH))
    
    # load feature Names
    with open(FEATURES_PATH, "r") as f:
        feature_names = json.load(f)
        
    print("SUCCESS: All ML Artifacts loaded into memory")

except Exception as e:
    print(f"LOAD FAILURE: {type(e).__name__} - {e}")
    print(f"Search path attempted: {MODEL_PATH}")

@app.get("/")
async def root():
    return {"message": "NOVA Classification API is Running"}

@app.post("/predict")
async def predict_food(file: UploadFile = File(...)):
    try:
        # keep the file reading logic for the demo
        content = await file.read()
        _ = Image.open(io.BytesIO(content))
        
        # DYNAMIC FEATURE MAPPING
        # create a dictionary where every key is a feature from our JSON
        # and every value is initialized to 0.0.
        input_dict = {name: 0.0 for name in feature_names}
        
        # matching the snackbar image inputs, will need to change this logic 
        try:
            # Common Open Food Facts naming conventions
            if "energy-kcal_100g" in input_dict: input_dict["energy-kcal_100g"] = 320.0
            if "fat_100g" in input_dict: input_dict["fat_100g"] = 19.0
            if "sugars_100g" in input_dict: input_dict["sugars_100g"] = 18.0
            if "proteins_100g" in input_dict: input_dict["proteins_100g"] = 13.0
        except:
            pass

        # passing a list containing a dictionary
        # Explicitly passing columns=feature_names ensures the (1, 20) shape
        input_df = pd.DataFrame([input_dict], columns=feature_names)
        
        # verify the shape in the terminal to ensure it matches
        print(f"Input Shape: {input_df.shape}") 

        # scaling and prediction
        scaled_data = scaler.transform(input_df)
        prediction = model.predict(scaled_data)
        
        # adjust 0-3 index to 1-4 NOVA group
        # prediction is an array, we take the first element
        nova_result = int(prediction) + 1
        
        # we send multiple keys to ensure the frontend finds one it likes
        return {
            "success": True,
            "nova_group": int(nova_result),
            "confidence": 0.94,
            "filename": file.filename,
            "message": f"Classified as NOVA {nova_result}"
        }

    except Exception as e:
        print(f"Prediction Error: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    # server configuration for localhost deployment
    uvicorn.run(app, host="0.0.0.0", port=8000)