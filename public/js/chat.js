function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const Chat = (() => {
    let chatHistory = [];
    let lastAiMessageElement = null;
    let chatInput = null;
    let chatMessages;

    function addUserMessage(messageText) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-container', 'user');
        messageDiv.innerHTML = `
      <div class="message user-message slide-in">
        <div class="message-content">
          <div class="message-header">
            <span class="user-label">Вы</span>
            <svg class="user-icon" viewBox="0 0 24 24"><path d="M12,4A4,4 0 0,1 16,8A4,4 0 0,1 12,12A4,4 0 0,1 8,8A4,4 0 0,1 12,4M12,14C16.42,14 20,15.79 20,18V20H4V18C4,15.79 7.58,14 12,14Z"></path></svg>
          </div>
          ${Animation.formatText(messageText)}
        </div>
      </div>
    `;
        chatMessages.appendChild(messageDiv);
        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function addAiMessage() {
        if (lastAiMessageElement) {
            lastAiMessageElement.removeAttribute('id');
        }
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('message-container', 'bot');
        messageDiv.innerHTML = `
      <div class="message bot-message">
        <div class="message-content">
          <div class="message-header">
            <svg class="ai-icon" viewBox="0 0 24 24"><path d="M12,4C9.97,4 8.5,5.34 8.5,7C8.5,8.66 9.97,10 12,10C14.03,10 15.5,8.66 15.5,7C15.5,5.34 14.03,4 12,4M12,12C8.69,12 6,14.24 6,17V20H18V17C18,14.24 15.31,12 12,12Z"></path></svg>
            <span class="ai-label">SPARK AI</span>
          </div>
          <div class="ai-message-content" id="last-message">...</div>
        </div>
      </div>
    `;
        chatMessages.appendChild(messageDiv);
        lastAiMessageElement = messageDiv.querySelector('#last-message');
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function handleServerResponse(data) {
        switch (data.type) {
            case 'step-query':
            case 'step-select-model':
            case 'step-search':
            case 'step-response':
                Animation.activateStep(data.type);
                break;
            case 'update-response':
                if (data.html) {
                    const loadingLabel = document.querySelector('.loading-text');
                    gsap.to(loadingLabel, { duration: 0.6, text: data.html, ease: "power2.out" });
                }
                break;
            case 'update-final-response':
                if (data.html) {
                    Animation.updateFormatting(document.querySelector('.solution-text'), data.html, () => {
                        MathJax.typesetPromise().then(() => console.log('Формулы отрендерены!'))
                            .catch(err => console.log('Ошибка MathJax:', err));
                    });
                }
                break;
            case 'final-response-done':
                if (data.html) {
                    chatHistory.push({
                        role: "model",
                        parts: [{ text: data.html }]
                    });
                }
                break;
            case 'new-message':
                addAiMessage();
                break;
            case 'update-last-message':
                if (data.html && lastAiMessageElement) {
                    Animation.updateFormatting(lastAiMessageElement, data.html, () => {
                        MathJax.typesetPromise().then(() => console.log('Формулы отрендерены!'))
                            .catch(err => console.log('Ошибка MathJax:', err));
                    });
                }
                break;
            case 'message-done':
                if (lastAiMessageElement) {
                    lastAiMessageElement.removeAttribute('id');
                    lastAiMessageElement = null;
                }
                if (data.html) {
                    chatHistory.push({
                        role: "model",
                        parts: [{ text: data.html }]
                    });
                }
                break;
            case 'file-uploaded':
                if (data.uri) {
                    window.fileUri = data.uri;
                    window.fileType = data.mimeType;
                    console.log("Image successfully uploaded on the server");
                }
                break;
            default:
                console.warn("Неизвестный тип сообщения от сервера:", data);
        }
    }

    async function sendChatMessage() {
        const messageText = chatInput.value.trim();
        if (messageText) {
            addUserMessage(messageText);
            try {
                const response = await fetch('https://spark-ai.up.railway.app/chat', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        question: messageText,
                        chatSession: chatHistory
                    })
                });
                chatHistory.push({ role: "user", parts: [{ text: messageText }] });
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                const reader = response.body.getReader();
                const decoder = new TextDecoder();
                let partialData = '';
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    partialData += decoder.decode(value);
                    const messages = partialData.split('\n').filter(line => line.trim() !== '');
                    messages.forEach(message => {
                        try {
                            const data = JSON.parse(message);
                            handleServerResponse(data);
                        } catch (e) {
                            console.error("Error parsing JSON message:", message, e);
                        }
                    });
                    partialData = messages.length > 0
                        ? partialData.substring(partialData.lastIndexOf(messages[messages.length - 1]) + messages[messages.length - 1].length)
                        : partialData;
                }
            } catch (error) {
                console.error("Ошибка при отправке запроса к серверу:", error);
            }
        }
    }

    async function askSparkAI(question, additionalPrompt) {
        try {
            const response = await fetch('https://spark-ai.up.railway.app/ask', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    question: question,
                    additionalPrompt: additionalPrompt,
                    image: window.fileUri,
                    mimeType: window.fileType
                })
            });
            chatHistory.push({
                role: "user",
                parts: [{ text: question + " " + additionalPrompt }]
            });
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let partialData = '';
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                partialData += decoder.decode(value);
                const messages = partialData.split('\n').filter(line => line.trim() !== '');
                messages.forEach(message => {
                    try {
                        const data = JSON.parse(message);
                        handleServerResponse(data);
                    } catch (e) {
                        console.error("Error parsing JSON message:", message, e);
                    }
                });
                partialData = messages.length > 0
                    ? partialData.substring(partialData.lastIndexOf(messages[messages.length - 1]) + messages[messages.length - 1].length)
                    : partialData;
            }
        } catch (error) {
            console.error("Ошибка при отправке запроса к серверу:", error);
        }
    }

    async function init() {
        await sleep(200);
        const solveButton = document.getElementById('solve-button');
        chatInput = document.getElementById('chat-input');
        chatMessages = document.querySelector('.chat-messages');
        const solveFormSection = document.getElementById('solve-form-section');
        const loadingSection = document.getElementById('loading-section');
        const notesInput = document.getElementById('notes-input');
        const taskInput = document.getElementById('task-input');
        const taskNumberInput = document.getElementById('task-number-input');
        solveButton.addEventListener('click', async () => {
            solveFormSection.style.display = 'none';
            loadingSection.style.display = 'flex';
            if (taskNumberInput.value !== "") {
                await askSparkAI(taskNumberInput.value, notesInput.value);
            } else {
                await askSparkAI(taskInput.value, notesInput.value);
            }
        });
        chatInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') sendChatMessage();
        });
        document.getElementById('send-button').addEventListener('click', sendChatMessage);
        // Дополнительные обработчики (например, для записи аудио) можно добавить здесь
    }

    return { init };
})();
