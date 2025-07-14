from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import os
import pandas as pd
from analyze_lies import analyze_csv_file

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "./temp_uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 파일 업로드 → 사용자 목록 반환
@app.post("/get_users")
async def get_users(file: UploadFile = File(...)):
    content = await file.read()
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as f:
        f.write(content)

    try:
        df = pd.read_csv(file_path, encoding="utf-8")
        df["User"] = df["User"].astype(str).str.strip()
        users = df["User"].dropna().unique().tolist()
        print("사용자 목록 추출:", users)
        return JSONResponse(content={"users": users, "filename": file.filename})
    except Exception as e:
        return JSONResponse(content={"error": f"CSV 처리 오류: {e}"}, status_code=400)

# 사용자 + 날짜 범위 → 분석 실행
@app.post("/analyze")
async def analyze(
    suspect: str = Form(...),
    filename: str = Form(...),
    date_range: str = Form("최근 7일")  # 기본값 
):
    file_path = os.path.join(UPLOAD_DIR, filename)

    if not os.path.exists(file_path):
        return JSONResponse(content={"error": "해당 파일을 찾을 수 없습니다."}, status_code=404)

    print(f"분석 시작: suspect='{suspect}', date_range='{date_range}'")
    result = analyze_csv_file(file_path, suspect, date_range)
    return JSONResponse(content={"bot_reply": result})
