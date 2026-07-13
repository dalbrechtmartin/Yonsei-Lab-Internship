from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
import polars as pl

app = FastAPI(title="Wavelength FOM API")

# CORS 
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dev MODE ONLY -> Restraint after
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {"message": "Hello World"}
    
@app.post("/upload-excel/")
async def process_excel(file: UploadFile = File(...)):
    df = pl.read_excel(await file.read(), engine="calamine")
    
    print(df.columns)
    print(df.head())
    
    return {"columns": df.columns, "data": df.to_dicts()}