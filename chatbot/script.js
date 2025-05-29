const chatBody = document.querySelector(".chat-body");
const messageInput = document.querySelector(".message-input");
const sendMessageButton = document.querySelector("#send-message");
const fileInput = document.querySelector("#file-input");


const userData = { 
    message: null,
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
                    📎 파일 다운로드<br>(${mime_type})
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




// **(챗봇 응답 나중에 llm 연동)
const generateBotResponse = () => {

}




const handleOutgoingMessage = (e) => {
    e.preventDefault();
    userData.message = messageInput.value.trim();
    messageInput.value = "";

    const filePreview = getFilePreviewHTML();

    const messageContent = `<div class="message-text"></div>
                            ${filePreview}`;

    const outgoingMessageDiv = createMessageElement(messageContent, "user-message");
    outgoingMessageDiv.querySelector(".message-text").textContent = userData.message;
    chatBody.appendChild(outgoingMessageDiv);

    // bot message delay
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


        // chatbot 응답
        generateBotResponse();

    }, 600);
}

// Enter 클릭 -> 메시지 보내기
messageInput.addEventListener("keydown", (e) => {
    const userMessage = e.target.value.trim();
    if(e.key === "Enter" && userMessage) {
        handleOutgoingMessage(e);
    }
});

// file 
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];    // 사용자가 선택한 첫번째 파일
    if(!file) return;

    const reader = new FileReader();    // 파일 읽기 위한 FileReader 객체 생성
    reader.onload = (e) => {
        const base64String = e.target.result.split(",")[1];

        userData.file = {
            data: base64String,
            mime_type: file.type,
            name: file.name
        }
        fileInput.value = "";
    }

    reader.readAsDataURL(file);
    
});


sendMessageButton.addEventListener("click", (e) => handleOutgoingMessage(e))

document.querySelector("#file-upload").addEventListener("click", () => fileInput.click());