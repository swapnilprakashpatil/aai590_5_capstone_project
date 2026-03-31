from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import joblib
import pandas as pd
from PIL import Image
import io

app = FastAPI()

# allow the frontend to communicate with our backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load your Capstone artifacts from Notebook 02
# Ensure these files are in the same folder as main.py
# load artifacts from our notebook code
# we should keep in backend folder for ease 
model = joblib.load("")
scaler = joblib.load("")

@app.post("/predict")
async def predict_food(file: UploadFile = File(...)):
    # receive the image from frontend
    content = await file.read()
    image = Image.open(io.BytesIO(content))
    
    # need to write a function here to extract our variables
    # for now, we will use mock data to test the connection:
    mock_data = pd.DataFrame([[200, 10, 5, 2, 0.5]], 
                             columns=['energy_100g', 'fat_100g', 'sugars_100g', 'proteins_100g', 'salt_100g'])
    
    # predict
    scaled_data = scaler.transform(mock_data)
    prediction = model.predict(scaled_data)
    
    return {
        "nova_group": int(prediction + 1),
        "confidence": 0.94
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)