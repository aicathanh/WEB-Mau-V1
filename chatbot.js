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
                        <div class="chatbot-avatar-container">
                            <img src="https://web-mau-v1.vercel.app/ms-sol-avatar.jpg?v=1.1" alt="Ms Sol Avatar" class="chatbot-header-avatar">
                            <div class="chatbot-status-indicator"></div>
                        </div>
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
                <img src="https://web-mau-v1.vercel.app/ms-sol-avatar.jpg?v=1.1" alt="Ms Sol" class="chatbot-toggle-avatar">
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
    let isSending = false;
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

    // Telegram Bot Notification Configuration
    const TELEGRAM_BOT_TOKEN = "8620660507:AAEvTNn4hdaEv5gFdmpSsDbOAe22QWz3I3A";
    const TELEGRAM_CHAT_ID = "8568257944";

    async function pushToTelegram(phone, chatLog) {
        if (TELEGRAM_BOT_TOKEN === "CHƯA_CÀI_ĐẶT") return;
        const message = `🔔 KHÁCH HÀNG MỚI TỪ CHATBOT\n\n📱 SĐT: ${phone}\n🌐 Nguồn: ${window.location.hostname}\n📅 ${new Date().toLocaleString('vi-VN')}\n\n💬 Tóm tắt:\n${chatLog.slice(-500)}`;
        try {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: message })
            });
        } catch (e) { console.error("Telegram Error:", e); }
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
            // GIẢI PHÁP SỬA LỖI: Tự động phát hiện và sửa lỗi bảng không có dấu |
            let fixedContent = content;
            if (fixedContent.includes("STT") && fixedContent.includes("Tên sản phẩm") && !fixedContent.includes("|")) {
                const lines = fixedContent.split('\n');
                let foundHeader = false;
                fixedContent = lines.map(line => {
                    const trimmed = line.trim();
                    if (trimmed.startsWith("STT") || trimmed.match(/^\d+[.\/\s-]/)) {
                        foundHeader = true;
                        // Tách cột bằng ít nhất 2 dấu cách hoặc tab
                        const cols = trimmed.split(/\s{2,}/);
                        return '| ' + cols.join(' | ') + ' |';
                    }
                    if (foundHeader && trimmed === "") { foundHeader = false; }
                    return line;
                }).join('\n');
                // Chèn thêm dòng phân cách tiêu đề nếu thiếu
                if (fixedContent.includes("| STT |") && !fixedContent.includes("|---|")) {
                    fixedContent = fixedContent.replace(/\| STT \|.*\|/g, "$&\n|---|---|---|---|---|---|---|---|");
                }
            }
            div.innerHTML = marked.parse(fixedContent.replace(/\[THÔNG TIN KHÁCH HÀNG:.*?\]/g, ""));
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
                
                // Giải pháp: Tìm thông tin khách hàng từ tin nhắn để chèn vào Header bản Zoom
                let customerHeader = "";
                const customerTagMatch = content.match(/\[THÔNG TIN KHÁCH HÀNG: (.*?)\]/);
                if (customerTagMatch) {
                    const info = customerTagMatch[1].split('|');
                    customerHeader = `
                        <div style="background: #f8f9fa; color: #333; padding: 20px; border: 1px solid #000; border-bottom: none; border-radius: 16px 16px 0 0; font-family: sans-serif;">
                            <h3 style="margin: 0 0 10px 0; color: #b6d7a8; -webkit-text-stroke: 0.5px #000;">THÔNG TIN ĐƠN HÀNG / BÁO GIÁ</h3>
                            <p style="margin: 3px 0;"><strong>Khách hàng:</strong> ${info[0] || '...'}</p>
                            <p style="margin: 3px 0;"><strong>Số điện thoại:</strong> ${info[1] || '...'}</p>
                            <p style="margin: 3px 0;"><strong>Địa chỉ:</strong> ${info[2] || '...'}</p>
                            <p style="margin: 3px 0;"><strong>Ngày lập:</strong> ${new Date().toLocaleDateString('vi-VN')}</p>
                        </div>
                    `;
                }

                modalTable.innerHTML = customerHeader + table.outerHTML;
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
        if (isSending) return;
        const text = chatInput.value.trim();
        if (!text) return;
        
        isSending = true;
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
            const systemPrompt = `Bạn là Sol — nhân viên kỹ thuật tư vấn của Sơn Lotus (3 năm kinh nghiệm thực chiến), KHÔNG phải chatbot.

TÔN CHỈ: "NHẮN TIN NHƯ NGƯỜI THẬT TRÊN ZALO - ĐI THẲNG TRỌNG TÂM".

QUY TẮC PHẢN HỒI (BẮT BUỘC):
1. CỰC KỲ SÚC TÍCH: 
   - Cắt bỏ 100% các câu dẫn rườm rà ("Dạ theo câu hỏi...", "Về vấn đề này..."). 
   - Trả lời ĐÚNG và TRỰC TIẾP cái khách đang hỏi. Tổng tin nhắn không nên quá 6-8 dòng.
2. ĐỘ DÀI TƯƠNG XỨNG: Hỏi ngắn -> Đáp ngắn (2-4 câu), kết bằng 1 câu hỏi dẫn dắt nhu cầu.
3. TUYỆT ĐỐI KHÔNG DÙNG **BOLD** (IN ĐẬM): Chat Zalo không dùng định dạng này. Muốn nhấn mạnh hãy dùng CHỮ HOA hoặc ngắt dòng.
4. HỎI NGƯỢC & NHẮC LẠI: Luôn hỏi để hiểu nhu cầu (súng phun, mã màu, giai đoạn dự án). Nhắc lại dữ kiện khách đã nói.
5. ĐIỀU CẤM: KHÔNG chào máy móc. KHÔNG dùng ngôn ngữ quảng cáo sáo rỗng. KHÔNG hứa hẹn khi chưa có dữ liệu.

QUY TRÌNH TƯ VẤN:
- Bước 1 (Loại gỗ): CHỈ hỏi 1 câu: "Dạ, anh/chị dùng cho gỗ tự nhiên hay gỗ công nghiệp ạ?" (Không dùng bold).
- Bước 2 (Giải pháp): Tư vấn 3 hướng xử lý siêu tinh gọn.

QUY TẮC HIỂN THỊ: Ảnh: ![tên](url). Bảng: 8 cột. Thẻ ẩn khách: [THÔNG TIN KHÁCH HÀNG: Tên|SĐT|Địa chỉ].

${isLeadCaptured ? "- KHÁCH ĐÃ CUNG CẤP SĐT RỒI. Tuyệt đối KHÔNG hỏi lại SĐT hay Zalo nữa." : (userMessageCount >= 2 ? "- Hiện tại đã có thể gợi ý để lại SĐT/Zalo: 'Anh/chị để lại SĐT/Zalo giúp em để bộ phận kỹ thuật hỗ trợ mình kỹ hơn ạ.' (Chỉ dùng khi tư vấn sâu/báo giá)." : "- Chặn tuyệt đối: KHÔNG được hỏi SĐT/Zalo trong 2 tin nhắn đầu tiên.") }

Tri thức chuyên môn của bạn: ${knowledgeBase}.`;
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

                    // 3. Gửi Telegram thông báo real-time
                    const phone = text.match(/(0[3|5|7|8|9][0-9]{8})|([0-9]{10,11})/)?.[0] || 'N/A';
                    pushToTelegram(phone, chatLog);
                }
            }
        } catch (error) {
            hideTyping();
            addMessageUI("Xin lỗi, Sol đang bận một chút, bạn thử lại sau nhé!", "bot");
        } finally {
            isSending = false;
            sendBtn.disabled = !chatInput.value.trim();
        }
    }

    // Auto-badge after 15s
    setTimeout(() => { if (!isChatOpen) badge.classList.add('show'); }, 15000);

    toggleBtn.addEventListener('click', () => {
        isChatOpen = !isChatOpen;
        chatWindow.classList.toggle('open', isChatOpen);
        if (isChatOpen) {
            chatInput.focus();
            badge.classList.remove('show');
            if (messagesContainer.children.length === 0) addMessageUI(DEFAULT_GREETING, 'bot', true);
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
        if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            if (chatInput.value.trim()) sendMessage();
        }
    });

    sendBtn.addEventListener('click', sendMessage);

    loadKnowledgeBase().then(() => {
        // Ready
    });
})();
