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
            console.error("Error loading knowledge base:", error);
        }
    }

    // Hàm tạo System Prompt
    function getSystemPrompt() {
        return `
Bạn là Trợ Lý AI Sơn Lotus - chuyên gia tư vấn về các giải pháp sơn an toàn hệ nước cho gỗ, kim loại và vật liệu mới.
Nhiệm vụ của bạn là hỗ trợ khách truy cập lịch sự, cung cấp thông tin chính xác về các sản phẩm, bảng giá, định mức và quy trình thi công.

Dưới đây là cơ sở dữ liệu kiến thức (Knowledge Base) của bạn:
${knowledgeBase}

Quy tắc giao tiếp bắt buộc:
1. Luôn chào hỏi thân thiện và kết thúc bằng cách mời họ đặt thêm câu hỏi.
2. Bạn phải định dạng các câu trả lời của mình bằng Markdown đầy đủ (in đậm ý chính, dùng gạch đầu dòng).
3. Tuyệt đối không tự ý bịa đặt các chương trình khuyến mãi (như giảm giá 30% hay mẫu thử miễn phí) nếu không có trong Knowledge Base.
4. Nếu người dùng hỏi điều gì ngoài phạm vi dữ liệu trên, hãy hướng dẫn họ để lại Số điện thoại hoặc gọi Hotline 0943 966 662 để gặp kỹ thuật viên tư vấn trực tiếp.
        `;
    }

    // Toggle logic Mở/Đóng Khung Chat
    toggleBtn.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('open');
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

    // CRM Integration Configuration
    const sessionId = 'ses_' + Math.random().toString(36).substr(2, 9);
    const CRM_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzR391uHa8ityRntWm3ooW0J6XprapwE3OE3x2dJ9sDFBTzW2neBQC5SB2jCEQQ9CgB7A/exec"; // Webhook link Google Sheets của bạn

    async function pushToCRM(data) {
        if (!CRM_WEBHOOK_URL) return;
        try {
            const payload = {
                sessionId: sessionId,
                timestamp: new Date().toLocaleString('vi-VN'),
                source: window.location.href,
                ...data
            };
            // Sử dụng fetch với mode no-cors để gửi dữ liệu về Google Sheets mà không bị chặn CORS bởi trình duyệt
            await fetch(CRM_WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (e) {
            console.error("CRM Push Error:", e);
        }
    }

    // In lời chào lúc refresh
    function appendGreeting() {
        let msgHtml = '';
        if (typeof marked !== 'undefined') {
             msgHtml = `<div class="chatbot-message bot chat-markdown">${marked.parse(DEFAULT_GREETING)}</div>`;
        } else {
             msgHtml = `<div class="chatbot-message bot chat-markdown">${DEFAULT_GREETING}</div>`;
        }
        messagesContainer.insertAdjacentHTML('beforeend', msgHtml);
        messageHistory = [
            { role: "system", content: getSystemPrompt() },
            { role: "assistant", content: DEFAULT_GREETING }
        ];
    }

    // Refresh Btn logic
    refreshBtn.addEventListener('click', () => {
        const icon = refreshBtn.querySelector('span');
        icon.classList.add('spin'); // Thêm hiệu ứng xoay icon refresh
        
        // Xóa toàn bộ lịch sử chat bằng cách gán rỗng
        messagesContainer.innerHTML = '';
        
        // In lại câu thiết lập chào mặc định ban đầu
        appendGreeting();

        // Gỡ hiệu ứng xoay của icon sau đúng 500ms
        setTimeout(() => {
            icon.classList.remove('spin');
        }, 500);
    });

    // Cài Auto-resize cho user input textarea
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        if (this.value.trim().length > 0) {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }
    });

    // Nhấn Enter để gửi (nếu muốn dấu Enter xuống dòng phải bấm Shift+Enter)
    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    // Gắn tin nhắn vào màn UI
    function addMessageUI(content, sender, isMarkdown = false) {
        const div = document.createElement('div');
        div.className = `chatbot-message ${sender}`;
        if (isMarkdown && sender === 'bot' && typeof marked !== 'undefined') {
            div.classList.add('chat-markdown');
            div.innerHTML = marked.parse(content);
        } else {
            div.textContent = content;
        }
        messagesContainer.appendChild(div);
        
        // Gắn sự kiện click nếu là ảnh để xem to
        const images = div.getElementsByTagName('img');
        const modalImg = modal.querySelector('#modal-img');
        const modalTable = modal.querySelector('#modal-table-container');

        for (let img of images) {
            img.addEventListener('click', () => {
                modalImg.src = img.src;
                modalImg.style.display = 'block';
                modalTable.style.display = 'none';
                modal.classList.add('active');
            });
        }

        // Gắn sự kiện click nếu là bảng báo giá để xem to
        const tables = div.getElementsByTagName('table');
        for (let table of tables) {
            table.style.cursor = 'zoom-in';
            table.title = "Click để xem bảng lớn hơn";
            table.addEventListener('click', () => {
                modalTable.innerHTML = table.outerHTML;
                modalTable.style.display = 'block';
                modalImg.style.display = 'none';
                modal.classList.add('active');
            });
        }

        scrollToBottom();
    }

    // Hiệu ứng "Đang nhập..." chờ AI
    function showTypingIndicator() {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.id = 'typing-indicator';
        div.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <span class="typing-text">Đang nhập...</span>
        `;
        messagesContainer.appendChild(div);
        scrollToBottom();
    }

    function hideTypingIndicator() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    // Scroll tự động xuống tin nhắn cuối
    function scrollToBottom() {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    let isSending = false;

    // Lấy thông tin LLM
    async function sendMessage() {
        if (isSending) return;
        const text = chatInput.value.trim();
        if (!text) return;

        isSending = true;
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;

        addMessageUI(text, 'user');
        messageHistory.push({ role: "user", content: text });
        userMessageCount++; // Tăng biến đếm mỗi khi khách gửi tin nhắn

        showTypingIndicator();

        try {
            // Nạp Knowledge Base vào system roles khi refresh chưa có data
            if (messageHistory.length > 0 && messageHistory[0].role === "system") {
                messageHistory[0].content = getSystemPrompt();
            }

            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": window.location.href, // OpenRouter yêu cầu
                    "X-Title": "Lotus Chatbot" // Định danh của AI Client
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: messageHistory,
                    temperature: 0.7
                })
            });

            if (!response.ok) {
                throw new Error("HTTP error " + response.status);
            }

            const data = await response.json();
            hideTypingIndicator(); // xóa dòng hiệu ứng dấu 3 chấm nhảy

            if (data.choices && data.choices[0] && data.choices[0].message) {
                const botReply = data.choices[0].message.content;
                messageHistory.push({ role: "assistant", content: botReply });
                addMessageUI(botReply, 'bot', true);

                // Tự động Gửi lịch sử chat vào email và Google Sheets nếu khách để lại SĐT
                const phoneRegex = /(03|05|07|08|09)+([0-9]{8})\b/g;
                const foundPhone = text.match(phoneRegex);
                
                let log = messageHistory
                    .filter(m => m.role !== 'system')
                    .map(m => (m.role === 'user' ? 'Khách hàng: ' : 'Chatbot: ') + m.content)
                    .join('\n\n---\n\n');

                if (foundPhone) {
                    isLeadCaptured = true; // Đánh dấu đã có lead
                    
                    // 1. Gửi về CRM Google Sheets (Type Lead)
                    pushToCRM({
                        type: 'lead_captured',
                        phone: foundPhone[0],
                        chat_history: log
                    });

                    // 2. Gửi Email thông báo
                    fetch("https://formsubmit.co/ajax/sales@sonlotus.vn", {
                        method: "POST",
                        headers: { 
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify({
                            _subject: "🛒 [CHATBOT] CÓ KHÁCH HÀNG ĐỂ LẠI SỐ ĐIỆN THOẠI!",
                            _template: "box",
                            "Dữ_Liệu_Lịch_Sử_Chat": log
                        })
                    }).catch(e => console.error(e));
                } else if (!isLeadCaptured && userMessageCount > 0 && userMessageCount % 5 === 0) {
                    // Nếu chưa có SĐT và cứ sau mỗi 5 câu hỏi của khách, lưu log "Khách quan tâm"
                    pushToCRM({
                        type: 'potential_interest',
                        phone: "Chưa có SĐT",
                        chat_history: log
                    });
                }
            } else {
                throw new Error("Dữ liệu phản hồi không đúng cấu trúc.");
            }
        } catch (error) {
            console.error(error);
            hideTypingIndicator();
            addMessageUI("Xin lỗi, tôi đang gặp sự cố khi kết nối đền máy chủ AI. Vui lòng thử lại sau.", "bot");
        } finally {
            isSending = false;
        }
    }

    // Mở trang với load content
    loadKnowledgeBase().then(() => {
        appendGreeting();
    });
})();
