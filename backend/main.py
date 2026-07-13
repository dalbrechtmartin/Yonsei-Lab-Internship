from fastapi import FastAPI
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