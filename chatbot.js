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
            <button id="chatbot-toggle" title="Chat với chúng tôi">
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
    modal.addEventListener('click', () => modal.classList.remove('active'));

    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const refreshBtn = document.getElementById('chatbot-refresh');
    const chatWindow = document.getElementById('chatbot-window');
    const messagesContainer = document.getElementById('chatbot-messages');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const badge = document.getElementById('chatbot-badge');

    // State
    let knowledgeBase = '';
    let isChatOpen = false;
    let messageHistory = [];
    let userMessageCount = 0;
    let isLeadCaptured = false;
    const DEFAULT_GREETING = "Em chào anh chị! Em là Sol tư vấn sơn Lotus. Em ở đây để sẵn sàng hỗ trợ anh chị ạ.";

    const OPENROUTER_API_KEY = "sk-4bd27113b7dc78d1-lh6jld-f4f9c69f";
    const OPENROUTER_MODEL = "ces-chatbot-gpt-5.4";
    const OPENROUTER_URL = "https://9router.vuhai.io.vn/v1/chat/completions";

    if (typeof marked !== 'undefined') {
        marked.setOptions({ breaks: true, gfm: true });
    }

    // CRM & Lead Capture Configuration
    const sessionId = 'ses_' + Math.random().toString(36).substr(2, 9);
    const CRM_WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzR391uHa8ityRntWm3ooW0J6XprapwE3OE3x2dJ9sDFBTzW2neBQC5SB2jCEQQ9CgB7A/exec";

    async function pushToCRM(data) {
        if (!CRM_WEBHOOK_URL) return;
        try {
            await fetch(CRM_WEBHOOK_URL, {
                method: "POST",
                mode: 'no-cors', // Google Apps Script yêu cầu no-cors khi gửi POST trực tiếp từ client
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, sessionId })
            });
        } catch (e) { console.error("CRM Error:", e); }
    }

    async function loadKnowledgeBase() {
        try {
            const response = await fetch('https://web-mau-v1.vercel.app/chatbot_data.txt');
            if (response.ok) knowledgeBase = await response.text();
        } catch (error) { console.error("Error loading knowledge:", error); }
    }

    function addMessageUI(content, sender, isMarkdown = false) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `chatbot-message-wrapper ${sender}`;
        
        const div = document.createElement('div');
        div.className = `chatbot-message ${sender}`;
        if (isMarkdown && sender === 'bot' && typeof marked !== 'undefined') {
            div.classList.add('chat-markdown');
            div.innerHTML = marked.parse(content);
        } else {
            div.textContent = content;
        }
        
        messageWrapper.appendChild(div);
        messagesContainer.appendChild(messageWrapper);
        
        // Image zoom & Table zoom logic
        div.querySelectorAll('img').forEach(img => {
            img.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalImg = modal.querySelector('#modal-img');
                const modalTable = modal.querySelector('#modal-table-container');
                modalImg.src = img.src;
                modalImg.style.display = 'block';
                modalTable.style.display = 'none';
                modal.classList.add('active');
            });
        });

        // Table zoom logic
        div.querySelectorAll('table').forEach(table => {
            table.style.cursor = 'zoom-in';
            table.addEventListener('click', (e) => {
                e.stopPropagation();
                const modalImg = modal.querySelector('#modal-img');
                const modalTable = modal.querySelector('#modal-table-container');
                modalTable.innerHTML = table.outerHTML;
                modalTable.style.display = 'block';
                modalImg.style.display = 'none';
                modal.classList.add('active');
            });
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function showTyping() {
        const div = document.createElement('div');
        div.className = 'typing-indicator';
        div.id = 'typing-indicator';
        div.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span class="typing-text">Sol đang nhập...</span>';
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;
        addMessageUI(text, 'user');
        messageHistory.push({ role: "user", content: text });
        userMessageCount++;
        const phoneRegex = /(0[3|5|7|8|9][0-9]{8})|([0-9]{10,11})/;
        if (phoneRegex.test(text)) { isLeadCaptured = true; }

        showTyping();
        try {
            const systemPrompt = `Bạn là Ms Sol, Chuyên gia Sơn Gốc Nước từ Sơn Lotus. Trả lời như một chuyên gia, xưng em gọi anh/chị. Nội dung NGẮN GỌN, tập trung đúng câu hỏi. KHÔNG dùng icon/emoji.

QUY TRÌNH TƯ VẤN SƠN GỖ (BẮT BUỘC 2 BƯỚC):
- Bước 1 (Khi khách hỏi chung về sơn gỗ): CHỈ hỏi 1 câu duy nhất: "Dạ, để em tư vấn đúng quy trình và tiết kiệm nhất cho mình, anh/chị cho em hỏi mình dùng cho **gỗ tự nhiên** hay **gỗ công nghiệp** (MDF, HDF...) ạ? Vì 2 loại gỗ này có quy trình thi công hoàn toàn khác nhau." Tuyệt đối KHÔNG trả lời gì thêm ở bước này.
- Bước 2 (Chỉ sau khi khách đã chọn loại gỗ): 
  + Nếu là Gỗ tự nhiên: Tư vấn 3 hướng (Lau giữ vân, Phun 2-trong-1 giữ vân, Sơn bệt che vân).
  + Nếu là Gỗ công nghiệp: Tư vấn Wood Paint hệ bệt (Lót + Màu + Phủ).

QUY TẮC HIỂN THỊ HÌNH ẢNH (BẢNG MÀU/QUY TRÌNH):
- Khi gửi hình ảnh hoặc bảng màu, BẮT BUỘC dùng cú pháp Markdown: ![tên hình ảnh](url) để ảnh hiển thị trực tiếp trong khung chat. 
- TUYỆT ĐỐI KHÔNG được chỉ gửi đường link trần (URL) cho khách.

QUY TẮC GIÁ CẢ & KHÁC:
- Tuyệt đối KHÔNG liệt kê bảng giá/đơn giá trừ khi khách hỏi giá cụ thể.
- Dùng Markdown: in đậm ý chính và dấu gạch đầu dòng (-).
${isLeadCaptured ? "- KHÁCH ĐÃ CUNG CẤP SĐT RỒI. Tuyệt đối KHÔNG hỏi lại SĐT hay Zalo nữa. Nếu gặp vấn đề chưa rõ, hãy nói: 'Dạ em đã nhận thông tin, bộ phận kỹ thuật sẽ sớm liên hệ mình ạ.'" : "- Nếu khách chưa cung cấp SĐT, hãy chủ động nhắc khách để lại SĐT/Zalo khi cần tư vấn sâu, báo giá cụ thể hoặc khi bạn chưa tự trả lời được (câu: 'Anh/chị để lại SĐT/Zalo giúp em để bộ phận kỹ thuật hỗ trợ mình kỹ hơn ạ.')."}
- Nhắc khách để lại SĐT khi cần báo giá sâu (nếu chưa có).
Kiến thức: ${knowledgeBase}.`;
            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [{ role: "system", content: systemPrompt }, ...messageHistory.slice(-10)]
                })
            });
            const data = await response.json();
            hideTyping();
            if (data.choices && data.choices[0]) {
                const reply = data.choices[0].message.content;
                messageHistory.push({ role: "assistant", content: reply });
                addMessageUI(reply, 'bot', true);

                // Lead Capture: Tự động gửi Email và Google Sheets khi có SĐT
                if (isLeadCaptured) {
                    const chatLog = messageHistory
                        .filter(m => m.role !== 'system')
                        .map(m => (m.role === 'user' ? 'Khách: ' : 'Sol: ') + m.content)
                        .join('\n\n');
                    
                    // 1. Gửi về Google Sheets
                    pushToCRM({
                        phone: text.match(/(0[3|5|7|8|9][0-9]{8})|([0-9]{10,11})/)?.[0] || 'N/A',
                        chat_history: chatLog,
                        source: window.location.hostname
                    });

                    // 2. Gửi Email thông báo
                    fetch("https://formsubmit.co/ajax/sales@sonlotus.vn", {
                        method: "POST",
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            _subject: "🔔 [CHATBOT] CÓ KHÁCH HÀNG ĐỂ LẠI SỐ ĐIỆN THOẠI!",
                            _template: "table",
                            "SĐT_Khách": text.match(/(0[3|5|7|8|9][0-9]{8})|([0-9]{10,11})/)?.[0],
                            "Lịch_Sử_Chat": chatLog
                        })
                    }).catch(e => console.error("Email Error:", e));
                }
            }
        } catch (error) {
            hideTyping();
            addMessageUI("Xin lỗi, Sol đang bận một chút, bạn thử lại sau nhé!", "bot");
        }
    }

    // Auto-badge after 15s
    setTimeout(() => { if (!isChatOpen) badge.classList.add('show'); }, 15000);

    toggleBtn.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('open');
        badge.classList.remove('show');
        if (isChatOpen) {
            toggleBtn.style.transform = 'scale(0)';
            setTimeout(() => toggleBtn.style.display = 'none', 300);
            if (messagesContainer.children.length === 0) addMessageUI(DEFAULT_GREETING, 'bot', true);
            chatInput.focus();
        }
    });

    closeBtn.addEventListener('click', () => {
        isChatOpen = false;
        chatWindow.classList.remove('open');
        toggleBtn.style.display = 'flex';
        setTimeout(() => toggleBtn.style.transform = 'scale(1)', 10);
    });

    refreshBtn.addEventListener('click', () => {
        if (confirm("Xóa lịch sử chat và làm mới?")) {
            messagesContainer.innerHTML = '';
            messageHistory = [];
            addMessageUI(DEFAULT_GREETING, 'bot', true);
        }
    });

    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        sendBtn.disabled = !this.value.trim();
    });

    chatInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
    });

    sendBtn.addEventListener('click', sendMessage);

    loadKnowledgeBase().then(() => {
        // Ready
    });
})();
