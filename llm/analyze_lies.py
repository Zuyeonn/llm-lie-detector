import os
import pandas as pd
from datetime import datetime, timedelta
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM, pipeline

os.environ["CUDA_VISIBLE_DEVICES"] = "3"
device = "cuda" if torch.cuda.is_available() else "cpu"
MODEL_NAME = "mistralai/Mistral-7B-Instruct-v0.3"

tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME, trust_remote_code=True)
model = AutoModelForCausalLM.from_pretrained(
    MODEL_NAME,
    device_map="auto",
    torch_dtype=torch.float16,
    trust_remote_code=True,
)
generator = pipeline("text-generation", model=model, tokenizer=tokenizer)

# suspect 발언 추출용 프롬프트
def build_extract_prompt(chat_text, suspect_name):
    return f"""
다음은 여러 사람의 대화입니다.

'{suspect_name}'의 발언만 시간 순으로 추출해주세요. 다른 사람 발언은 절대 포함하지 마세요.

출력 예시:
[YYYY-MM-DD HH:MM] 발언 내용
[YYYY-MM-DD HH:MM] 발언 내용
...

대화 내용:
{chat_text}

결과:
"""


# 발언 분석 프롬프트
def build_analysis_prompt(suspect_utterances, suspect_name):
    return f"""
다음은 '{suspect_name}'의 발언입니다. 발언 중 거짓말이 포함된 발언을 분석하세요.

✅ 분석 목표:
- 거짓말 가능성이 있는 발언만 추출 (신뢰 점수 50 이하)
- 모순되거나 핑계, 회피성 발언만 출력
- 평범한 발언 (인사말, 날씨, 음식 등)은 절대 출력하지 마세요

✅ 출력 형식:
1. [YYYY-MM-DD HH:MM] 발언
→ 신뢰 점수: XX%
→ 이유: (1문장으로 설명)

✅ 출력 규칙:
- 반드시 신뢰 점수 50 이하인 발언만 출력 (높은 점수는 출력하지 마세요)
- 거짓말이 없는거 같으면 없다고 해주세요
- 전체 설명은 1000자 이내
- 출력 반복 금지
- 코드, 리스트, 표는 절대 출력 금지
- 사람처럼 자연스럽고 간결하게 써 주세요

발언 목록:
{suspect_utterances}

거짓말 분석을 시작해 주세요.
"""


# LLM 호출
def call_kanana(prompt, max_tokens=2048):
    try:
        output = generator(
            prompt,
            max_new_tokens=max_tokens,
            do_sample=True,
            temperature=0.65,   # 카나나는 0.65 정도가 자연스럽고 안정됨
            top_k=50,
            top_p=0.95,
        )
        full_output = output[0]["generated_text"]
        result = full_output[len(prompt):].strip()
        if not result:
            return "모델이 응답을 생성하지 않았습니다. (빈 응답)"
        return result
    except Exception as e:
        return f"모델 호출 중 오류 발생: {e}"


# 메인 분석 함수 
def analyze_csv_file(file_path: str, suspect_name: str, date_range: str = "최근 7일"):
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return f"CSV 파일 읽기 실패: {e}"

    df["Date"] = pd.to_datetime(df["Date"], errors="coerce")
    df = df.dropna(subset=["Date"])

    today = df["Date"].max()
    if "일주일" in date_range or "7일" in date_range:
        start_date = today - timedelta(days=7)
    elif "이주일" in date_range or "14일" in date_range:
        start_date = today - timedelta(days=14)
    elif "3일" in date_range:
        start_date = today - timedelta(days=3)
    else:
        start_date = today - timedelta(days=7)
    end_date = today

    filtered_df = df[(df["Date"] >= start_date) & (df["Date"] <= end_date)]
    suspect_df = filtered_df[filtered_df["User"] == suspect_name]
    if suspect_df.empty:
        return f"{suspect_name}의 발언이 해당 기간에 없습니다."
    
    if filtered_df.empty:
        return "해당 기간에 대화가 없습니다."

    # 전체 대화 정리
    chat_text = ""
    for _, row in filtered_df.iterrows():
        time = row["Date"].strftime("%Y-%m-%d %H:%M")
        user = row["User"]
        msg = str(row["Message"]).strip()
        if msg:
            chat_text += f"{user} ({time}): {msg}\n"

    if not chat_text.strip():
        return "대화 내용이 비어 있습니다."

    # 발언 추출
    extract_prompt = build_extract_prompt(chat_text, suspect_name)
    suspect_utterances = call_kanana(extract_prompt, max_tokens=1024)

    if "모델이 응답을 생성하지 않았습니다" in suspect_utterances:
        return "Step1 오류: 발언 추출 실패"

    # 발언 분석
    analysis_prompt = build_analysis_prompt(suspect_utterances, suspect_name)
    final_analysis = call_kanana(analysis_prompt, max_tokens=2048)

    if "모델이 응답을 생성하지 않았습니다" in final_analysis:
        return "Step2 오류: 분석 실패"
      
    return f"""
✅ 거짓말 분석 결과:
{final_analysis}
"""
