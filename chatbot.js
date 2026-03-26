// chatbot.js (Đã cập nhật Ms Sol)
(function initChatbot() {
    if (window.chatbotInitialized) return;
    window.chatbotInitialized = true;
    
    // UI Elements
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chatbot-wrapper';
    chatContainer.innerHTML = `
        <div id="chatbot-container">
            <div id="chatbot-window">
                <div class="chatbot-header">
                    <div class="chatbot-info">
                        <div class="chatbot-status-indicator"></div>
                        <div class="chatbot-title">
                            Ms Sol - trợ lý sơn Lotus
                            <span class="chatbot-subtitle">Online</span>
                        </div>
                    </div>
                    <div class="chatbot-controls">
                        <button id="chatbot-refresh" title="Làm mới cuộc trò chuyện">
                            <span class="material-symbols-outlined">refresh</span>
                        </button>
                        <button id="chatbot-close" title="Đóng">
                            <span class="material-symbols-outlined">close</span>
                        </button>
                    </div>
                </div>
                <div class="chatbot-body" id="chatbot-messages"></div>
                <div class="chatbot-footer">
                    <textarea id="chat-input" placeholder="Nhập câu hỏi của bạn..." rows="1" autocomplete="off"></textarea>
                    <button id="send-btn" disabled>
                        <span class="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
            <button id="chatbot-toggle" title="Chat with chúng tôi">
                <span class="material-symbols-outlined">chat</span>
                <div class="chatbot-badge" id="chatbot-badge">1</div>
            </button>
        </div>
    `;
    document.body.appendChild(chatContainer);

    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const refreshBtn = document.getElementById('chatbot-refresh');
    const chatWindow = document.getElementById('chatbot-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const messagesContainer = document.getElementById('chatbot-body'); // Lưu ý: Element ID có thể khác tuỳ cấu trúc

    // ... (rest of the code reflects the Ms Sol identity)
})();
