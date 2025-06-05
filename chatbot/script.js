const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");

let fileUploadedOnce = false;


const userData = { 
    stage: "awaiting_file", 
    message: null,
    suspect: null,
    file: {
        data: null,
        mime_type: null,
        name: null
    }
}


const getFilePreviewHTML = () => {
    const { data, mime_type, name } = userData.file;
    if (!data || !mime_type) return "";

    const base64 = `data:${mime_type};base64,${data}`;
    const filename = name ? encodeURIComponent(name) : "file";

    if (mime_type.startsWith("image/")) {
        return `<img src="${base64}" alt="Uploaded Image" class="attachment" />`;
    } else if (mime_type === "application/pdf") {
        return `<embed src="${base64}" type="application/pdf" class="attachment pdf-preview" />`;
    } else {
        return `
            <div class="attachment-box">
                <a href="${base64}" download="${filename}" class="attachment">
                    📎 파일 업로드<br>(${mime_type})
                </a>
            </div>`;
    }
};


const createMessageElement = (content, ...classes) => {
    const div = document.createElement("div");
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}




// ** 챗봇 응답 - llm 연동
const generateBotResponse = () => {
    const formData = new FormData();

    // 1단계: 파일 업로드 → 사용자 목록 요청
    if (userData.stage === "awaiting_file" && userData.file.data) {

        // ✅ [검증 코드: 파일이 정상인지 확인]
        if (!userData.file.name || !userData.file.mime_type || !userData.file.data) {
            alert("⚠️ 파일 정보가 불완전합니다. 다시 업로드 해주세요.");
            return;
        }

        const byteCharacters = atob(userData.file.data);
        const byteArray = new Uint8Array([...byteCharacters].map(c => c.charCodeAt(0)));
        const blob = new Blob([byteArray], { type: userData.file.mime_type });
        const file = new File([blob], userData.file.name, { type: userData.file.mime_type });

        console.log("🧾 생성된 File 객체 확인:", file);

        formData.append("file", file); // 파일만 전송

        for (let pair of formData.entries()) {
            console.log(`🧾 FormData key: ${pair[0]}`, pair[1]);
        }


        fetch("http://210.125.91.90:8000/get_users", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {

            console.log("📥 서버 응답:", data); // 여기서 확인해보세요

            if (data.error) {
                alert("❌ 서버 오류: " + data.error);
                return;
            }

            const botMessageDiv = document.querySelector(".bot-message.thinking");
            botMessageDiv.classList.remove("thinking");
            botMessageDiv.querySelector(".message-text").innerHTML =
              `📌 분석 가능한 사용자 목록: ${data.users.join(", ")}<br>분석할 사용자를 입력해주세요.`;

            userData.stage = "awaiting_user";
            userData.file.filename = data.filename;
        });
    }

    // 사용자 이름 입력 → 날짜 질문
    else if (userData.stage === "awaiting_user" && userData.message) {
        userData.suspect = userData.message;
        userData.message = null;  

        const botMessageDiv = document.querySelector(".bot-message.thinking");
        botMessageDiv.classList.remove("thinking");
        botMessageDiv.querySelector(".message-text").innerHTML =
          `📅 분석할 대화 기간을 입력해주세요.<br>예: "최근 일주일", "2025년 5월 1일부터 5월 5일까지"`;

        userData.stage = "awaiting_date";
    }

    // 날짜 입력 → 분석 요청
    else if (userData.stage === "awaiting_date" && userData.message) {
        formData.append("suspect", userData.suspect);
        formData.append("filename", userData.file.name);
        formData.append("date_range", userData.message);  
        fetch("http://210.125.91.90:8000/analyze", {
            method: "POST",
            body: formData
        })
        .then(res => res.json())
        .then(data => {
            const botMessageDiv = document.querySelector(".bot-message.thinking");
            botMessageDiv.classList.remove("thinking");
            botMessageDiv.querySelector(".message-text").textContent = data.bot_reply;
            userData.stage = "done";
        });
    }
}




const handleOutgoingMessage = (e) => {
    e.preventDefault();

    const msg = messageInput.value.trim();
    const filePreview = getFilePreviewHTML();

    // 메시지 또는 파일이 없으면 무시
    if (!msg && !userData.file.data) return;

    userData.message = msg;
    messageInput.value = "";

    const messageContent = `<div class="message-text"></div>${filePreview}`;
    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = msg;
    chatBody.appendChild(outgoingMessageDiv);

    // 파일 업로드 표시 여부 업데이트
    if (filePreview) fileUploadedOnce = true;

    setTimeout(() => {
        const messageContent = `<svg class="bot-avatar" xmlns="http://www.w3.org/2000/svg" width="50" height="50" 
                viewBox="0 0 1024 1024">
                <path d="M738.3 287.6H285.7c-59 0-106.8 47.8-106.8 106.8v303.1c0 59 47.8 106.8 106.8 106.8h81.5v111.1c0 .7.8 1.1 1.4.7l166.9-110.6 41.8-.8h117.4l43.6-.4c59 0 106.8-47.8 106.8-106.8V394.5c0-59-47.8-106.9-106.8-106.9zM351.7 448.2c0-29.5 23.9-53.5 53.5-53.5s53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5-53.5-23.9-53.5-53.5zm157.9 267.1c-67.8 0-123.8-47.5-132.3-109h264.6c-8.6 61.5-64.5 109-132.3 109zm110-213.7c-29.5 0-53.5-23.9-53.5-53.5s23.9-53.5 53.5-53.5 53.5 23.9 53.5 53.5-23.9 53.5-53.5 53.5zM867.2 644.5V453.1h26.5c19.4 0 35.1 15.7 35.1 35.1v121.1c0 19.4-15.7 35.1-35.1 35.1h-26.5zM95.2 609.4V488.2c0-19.4 15.7-35.1 35.1-35.1h26.5v191.3h-26.5c-19.4 0-35.1-15.7-35.1-35.1zM561.5 149.6c0 23.4-15.6 43.3-36.9 49.7v44.9h-30v-44.9c-21.4-6.5-36.9-26.3-36.9-49.7 0-28.6 23.3-51.9 51.9-51.9s51.9 23.3 51.9 51.9z"></path>
                </svg>
                <div class="message-text">
                    <div class="thinking-indicator">
                        <div class="dot"></div>
                        <div class="dot"></div>
                        <div class="dot"></div>
                    </div>
                </div>`;
        const incomingMessageDiv = createMessageElement(messageContent, "bot-message", "thinking");
        chatBody.appendChild(incomingMessageDiv);

        generateBotResponse();

        // 전송 직후 입력 초기화 (중복 방지)
        userData.message = null;

    }, 600);
};




// Enter 클릭 -> 메시지 보내기
messageInput.addEventListener("keydown", (e) => {
    if (e.isComposing) return;

    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault(); 
        const msg = messageInput.value.trim();
        if (msg || userData.file.data) {
            handleOutgoingMessage(e);
        }
    }
});


fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];   
    if(!file) return;

    const reader = new FileReader();  
    reader.onload = (e) => {
        const base64String = e.target.result.split(",")[1];

        userData.file = {
            data: base64String,
            mime_type: file.type,
            name: file.name
        }
        fileUploadedOnce = false; // 새 파일 선택 시 초기화
        fileInput.value = "";
    }

    reader.readAsDataURL(file);
    
});



// sendMessageButton.addEventListener("click", (e) => {
//     const userMessage = messageInput.value.trim();
//     if (userMessage || userData.file.data) {
//         handleOutgoingMessage(e);
//     }
// });

document.querySelector(".chat-form").addEventListener("submit", (e) => {
    e.preventDefault(); 

    const userMessage = messageInput.value.trim();
    if (userMessage || userData.file.data) {
        handleOutgoingMessage(e);
    }
});


document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());