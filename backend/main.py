from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware

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
async def upload_excel(file: UploadFile = File(...)):
    content = await file.read()
    
    return {
        "filename": file.filename, 
        "size_bytes": len(content), 
        "message": "Fichier reçu avec succès par Python !"
    }