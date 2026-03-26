// chatbot.js
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
                            Trợ Lý AI Sơn Lotus
                            <span class="chatbot-subtitle">tư vấn 24/7</span>
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
                <div class="chatbot-body" id="chatbot-messages">
                    <!-- Tiết mục hiện Chat-->
                </div>
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

    // Lightbox Modal setup
    const modal = document.createElement('div');
    modal.className = 'chatbot-image-modal';
    modal.innerHTML = `
        <span class="close-modal">&times;</span>
        <div class="modal-content-container">
            <img id="modal-img" src="" alt="Zoomed view">
            <div id="modal-table-container"></div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', () => {
        modal.classList.remove('active');
    });

    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const refreshBtn = document.getElementById('chatbot-refresh');
    const chatWindow = document.getElementById('chatbot-window');
    const messagesContainer = document.getElementById('chatbot-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');

    // State
    let knowledgeBase = '';
    let isChatOpen = false;
    let messageHistory = [];
    let userMessageCount = 0; // Biến đếm số câu hỏi của khách
    let isLeadCaptured = false; // Đánh dấu đã lưu SĐT chưa
    const DEFAULT_GREETING = "Xin chào bạn! 👋 Tôi là AI Sơn trợ lý của hãng sơn Lotus. Tôi có thể giúp gì cho bạn hôm nay?";

    // Cấu hình OpenRouter API / Custom Endpoint
    const OPENROUTER_API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
    const OPENROUTER_MODEL = "ces-chatbot-gpt-5.4";
    const OPENROUTER_URL = "https://9router.vuhai.io.vn/v1/chat/completions";

    // Setup Marked.js option
    if (typeof marked !== 'undefined') {
        marked.setOptions({
            breaks: true,
            gfm: true
        });
    }

    // Load Knowledge Base txt file
    async function loadKnowledgeBase() {
        try {
            // Sử dụng URL tuyệt đối để chatbot có thể chạy được khi nhúng vào các trang web khác (như Ladipage)
            const response = await fetch('https://web-mau-v1.vercel.app/chatbot_data.txt');
            if (response.ok) {
                knowledgeBase = await response.text();
            } else {
                console.warn("Lỗi không tìm thấy file chatbot_data.txt. Sẽ sử dụng kiến thức mặc định.");
            }
        } catch (error) {
            console.error("Lỗi khi tải bộ não kiến thức:", error);
        }
    }
    loadKnowledgeBase();

    function createMessageElement(content, isUser = false) {
        const div = document.createElement('div');
        div.className = `chatbot-message ${isUser ? 'user' : 'bot'}`;
        if (isUser) {
            div.textContent = content;
        } else {
            const markdownContainer = document.createElement('div');
            markdownContainer.className = 'chat-markdown';
            if (typeof marked !== 'undefined') {
                markdownContainer.innerHTML = marked.parse(content);
                // Gắn sự kiện zoom ảnh sau khi render markdown
                markdownContainer.querySelectorAll('img').forEach(img => {
                    img.addEventListener('click', (e) => {
                        e.stopPropagation();
                        showImageModal(img.src);
                    });
                });
                // Chống cuộn toàn trang khi đang cuộn bảng
                markdownContainer.querySelectorAll('table').forEach(table => {
                    table.addEventListener('wheel', (e) => {
                        const isAtLeft = table.scrollLeft <= 0;
                        const isAtRight = table.scrollLeft + table.clientWidth >= table.scrollWidth;
                        if (e.deltaX < 0 && isAtLeft) return;
                        if (e.deltaX > 0 && isAtRight) return;
                        e.stopPropagation();
                    });
                });
            } else {
                markdownContainer.textContent = content;
            }
            div.appendChild(markdownContainer);
        }
        return div;
    }

    function showImageModal(src) {
        const modalImg = document.getElementById('modal-img');
        const modalTableContainer = document.getElementById('modal-table-container');
        modalTableContainer.innerHTML = ''; // Reset table inside modal
        modalImg.src = src;
        modalImg.style.display = 'block';
        modal.classList.add('active');
    }

    function showTableModal(html) {
        const modalImg = document.getElementById('modal-img');
        const modalTableContainer = document.getElementById('modal-table-container');
        modalImg.style.display = 'none';
        modalTableContainer.innerHTML = html;
        modal.classList.add('active');
    }

    function addMessage(content, isUser = false) {
        const msgEl = createMessageElement(content, isUser);
        messagesContainer.appendChild(msgEl);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        if (!isUser) {
            messageHistory.push({ role: "assistant", content });
        }
    }

    function showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'chatbot-message bot typing';
        div.id = 'typing-indicator';
        div.innerHTML = `
            <span>AI đang gõ</span>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) indicator.remove();
    }

    async function loadInitialMessages() {
        if (messagesContainer.children.length === 0) {
            addMessage(DEFAULT_GREETING);
        }
    }

    const badge = document.getElementById('chatbot-badge');

    // Hiện thông báo sau 15 giây nếu khách chưa mở chat
    setTimeout(() => {
        if (!isChatOpen) {
            badge.classList.add('show');
        }
    }, 15000);

    // Toggle logic Mở/Đóng Khung Chat
    toggleBtn.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('open');
        badge.classList.remove('show');
        if (isChatOpen) {
            toggleBtn.style.transform = 'scale(0)';
            setTimeout(() => toggleBtn.style.display = 'none', 300);
            chatInput.focus();

            // Gửi thống kê "Có khách mở chat" về CRM
            pushToCRM({ type: 'visit_chat', status: 'started' });
        }
    });

    closeBtn.addEventListener('click', () => {
        isChatOpen = false;
        chatWindow.classList.remove('open');
        toggleBtn.style.display = 'flex';
        setTimeout(() => toggleBtn.style.transform = 'scale(1)', 10);
    });

    refreshBtn.addEventListener('click', () => {
        if (confirm("Làm mới cuộc trò chuyện? (Lịch sử chat hiện tại sẽ bị xóa)")) {
            messagesContainer.innerHTML = '';
            messageHistory = [];
            userMessageCount = 0;
            isLeadCaptured = false;
            addMessage(DEFAULT_GREETING);
        }
    });

    // CRM Integration (Google Sheets Webhook)
    async function pushToCRM(data) {
        const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzR391uHa8ityRntWm3ooW0J6XprapwE3OE3x2dJ9sDFBTzW2neBQC5SB2jCEQQ9CgB7A/exec";
        try {
            // Chuẩn hoá dữ liệu trước khi gửi
            const payload = {
                timestamp: new Date().toISOString(),
                source: window.location.href,
                ...data
            };

            // Chế độ 'no-cors' để tránh lỗi CORS khi gọi Apps Script trực tiếp từ trình duyệt
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                cache: 'no-cache',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.warn("CRM Sync failed", e);
        }
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage(text, true);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;

        userMessageCount++;
        messageHistory.push({ role: "user", content: text });

        // Logic thu thập Lead (SĐT)
        const phoneRegex = /(0[3|5|7|8|9])+([0-9]{8})\b/g;
        const foundPhone = text.match(phoneRegex);
        if (foundPhone && !isLeadCaptured) {
            isLeadCaptured = true;
            pushToCRM({ 
                type: 'lead_capture', 
                status: 'success', 
                customer_phone: foundPhone[0],
                last_message: text 
            });
        }

        // Logic gửi báo cáo định kỳ (Tăng khả năng chốt sale ngay cả khi khách chưa để lại SĐT)
        if (userMessageCount % 5 === 0 && !isLeadCaptured) {
             pushToCRM({ 
                type: 'potential_interest', 
                status: 'engaged', 
                message_count: userMessageCount,
                last_activity: text
            });
        }

        showTypingIndicator();

        try {
            const systemPrompt = `Bạn là Trợ lý bán hàng chuyên nghiệp của Sơn Lotus. 
Dưới đây là kiến thức của bạn: 
${knowledgeBase}

HƯỚNG DẪN TRẢ LỜI:
1. Luôn lịch sự, niềm nở. Sử dụng Markdown để trình bày (đặc biệt là Bảng cho báo giá).
2. Nếu khách hỏi giá, hãy trình bày bằng bảng (Quy cách, 1kg, 5kg, 20kg).
3. Nếu khách hỏi quy trình, hãy nêu các bước rõ ràng và đính kèm Link ảnh nếu có trong dữ liệu.
4. Ưu tiên hướng dẫn khách để lại SĐT để được tư vấn kỹ thuật/pha màu miễn phí.
5. Luôn ưu tiên dùng kiến thức trong file đính kèm. Nếu không có, hãy trả lời dựa trên định vị thương hiệu là Sơn hệ nước an toàn.`;

            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [
                        { role: "system", content: systemPrompt },
                        ...messageHistory.slice(-10) // Gửi 10 tin nhắn gần nhất để giữ ngữ cảnh
                    ]
                })
            });

            const data = await response.json();
            removeTypingIndicator();

            if (data.choices && data.choices[0]) {
                const botReply = data.choices[0].message.content;
                addMessage(botReply);
            } else {
                addMessage("Xin lỗi, tôi gặp chút trục trặc khi kết nối. Bạn có thể thử lại sau giây lát!");
            }
        } catch (error) {
            removeTypingIndicator();
            console.error("Chat Error:", error);
            addMessage("Rất tiếc, hệ thống đang bận. Bạn vui lòng nhắn lại sau nhé!");
        }
    }

    // Event Listeners
    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = (chatInput.scrollHeight) + 'px';
        sendBtn.disabled = chatInput.value.trim() === '';
    });

    // Load greeting on start
    loadInitialMessages();
})();
