// chatbot.js
(function initChatbot() {
    if (window.chatbotInitialized) return;
    window.chatbotInitialized = true;
    
    // UI Elements
    const chatContainer = document.createElement('div');
    // Configuration based on Domain
    const isJades = window.location.hostname.includes('jades.vn');
    const BOT_NAME = isJades ? 'Mr Ben - tư vấn sơn Lotus' : 'Ms Sol - trợ lý sơn Lotus';
    const BOT_AVATAR = isJades ? 'https://web-mau-v1.vercel.app/mr-ben-avatar.png' : 'https://web-mau-v1.vercel.app/ms-sol-avatar.jpg?v=1.1';
    const BOT_THEME_COLOR = isJades ? '#3c9b7e' : '#e9c349'; 
    const BOT_SUBTITLE = 'Online';
    const DEFAULT_GREETING = isJades ? "Chào anh chị! Em là Ben - chuyên gia kỹ thuật Sơn Lotus. Rất vui được hỗ trợ anh chị ạ." : "Em chào anh chị! Em là Sol tư vấn sơn Lotus. Em ở đây để sẵn sàng hỗ trợ anh chị ạ.";
    const TYPING_TEXT = isJades ? 'Ben đang nhập...' : 'Sol đang nhập...';

    chatContainer.id = 'chatbot-wrapper';
    chatContainer.innerHTML = `
        <div id="chatbot-container">
            <div id="chatbot-window">
                <style>
                    #send-btn { background: ${BOT_THEME_COLOR} !important; }
                    .chatbot-status-indicator { background-color: ${isJades ? '#22c55e' : '#10b981'} !important; }
                    #upload-btn { color: ${BOT_THEME_COLOR} !important; }
                    .chatbot-message.user { background: ${BOT_THEME_COLOR} !important; }
                </style>
                <div class="chatbot-header">
                    <div class="chatbot-info">
                        <div class="chatbot-avatar-container">
                            <img src="${BOT_AVATAR}" alt="${BOT_NAME}" class="chatbot-header-avatar" style="border: 2px solid ${BOT_THEME_COLOR} !important;">
                            <div class="chatbot-status-indicator"></div>
                        </div>
                        <div class="chatbot-title">
                            ${BOT_NAME}
                            <span class="chatbot-subtitle">${BOT_SUBTITLE}</span>
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
                    <input type="file" id="image-upload" accept="image/*" style="display: none;">
                    <button id="upload-btn" title="Gửi ảnh mẫu">
                        <span class="material-symbols-outlined">add_photo_alternate</span>
                    </button>
                    <textarea id="chat-input" placeholder="Nhập câu hỏi..." rows="1" autocomplete="off"></textarea>
                    <button id="send-btn" disabled>
                        <span class="material-symbols-outlined">send</span>
                    </button>
                </div>
            </div>
            <button id="chatbot-toggle" title="Chat với chúng tôi" style="border: 3px solid ${BOT_THEME_COLOR} !important;">
                <img src="${BOT_AVATAR}" alt="${BOT_NAME}" class="chatbot-toggle-avatar">
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
    let knowledgeBase = `### THÔNG SỐ KỸ THUẬT & BẢNG GIÁ (KNOWLEDGE BASE V3.7)
1. Lacquer 2K71 Indoor: Sơn phủ PU 2 thành phần. Giá: 185.000đ/kg. Tỷ lệ đóng rắn: 15%.
2. Chất Đóng Rắn (Hardener): Giá 740.000đ (1kg), 390.000đ (0.5kg), 85.000đ (0.1kg).
3. Sơn Gỗ Ngoài Trời 2K (2K33): Giá 216.000đ/kg. Tỷ lệ đóng rắn: 15%.

BẢNG GIÁ ĐƯỢC CẬP NHẬT TỪ chatbot_data.txt (NẾU LOAD THÀNH CÔNG):
| NHÓM SẢN PHẨM | TÊN SẢN PHẨM | GIÁ 1KG | GIÁ 5KG | GIÁ 20KG |
| --- | --- | --- | --- | --- |
| GỖ & GIẢ GỖ | Lót Trong Suốt (Sanding Sealer) | 145.800 | 648.000 | 2.447.280 |
| GỖ & GIẢ GỖ | Lót Trắng (Wood Primer) | 145.800 | 648.000 | 2.447.280 |
| GỖ & GIẢ GỖ | Sơn Lau Gỗ (Wood Stain) | 194.400 | 864.000 | 3.311.280 |
| GỖ & GIẢ GỖ | Sơn Gỗ Ngoài Trời 2K (2K33) | 216.000 | 1.047.600 | 3.866.400 |
| GỖ & GIẢ GỖ | Sơn Nội Thất (Finish Interior) | 199.800 | 939.600 | 3.564.000 |
| GỖ & GIẢ GỖ | Sơn Ngoại Thất & Sàn (2K72) | 199.800 | 939.600 | 3.564.000 |
| PHỤ TRỢ | Chất Đóng Rắn (Hardener) | 740.000 (1kg) | 390.000 (0.5kg) | 85.000 (0.1kg) |
| GỖ NGOÀI TRỜI | Sơn Màu Bệt Ngoài Trời (Wood Paint Exterior) | 291.600 | 1.404.000 | 5.248.800 |
`;
    let isChatOpen = false;
    let isSending = false;
    let messageHistory = [];
    let userMessageCount = 0;
    let isLeadCaptured = localStorage.getItem('chatbot_lead_captured') === 'true';
    let capturedPhone = localStorage.getItem('chatbot_phone') || '';
    let hasSentGreetingLog = false;
    let hasSent3InteractionsLog = false;

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
            const response = await fetch('chatbot_data.txt');
            if (response.ok) knowledgeBase = await response.text();
        } catch (error) { console.error("Error loading knowledge:", error); }
    }

    function addMessageUI(content, sender, isMarkdownInput = false) {
        const messageWrapper = document.createElement('div');
        messageWrapper.className = `chatbot-message-wrapper ${sender}`;
        
        // Tự động nhận diện markdown nếu chứa cú pháp ảnh hoặc bảng
        const isMarkdown = isMarkdownInput || content.includes('![') || content.includes('|');
        
        const div = document.createElement('div');
        div.className = `chatbot-message ${sender}`;
        if (isMarkdown && typeof marked !== 'undefined') {
            div.classList.add('chat-markdown');
            // GIẢI PHÁP SỬA LỖI: Tự động phát hiện và sửa lỗi bảng không có dấu | (chỉ áp dụng cho bot)
            let fixedContent = content;
            if (sender === 'bot' && fixedContent.includes("STT") && fixedContent.includes("Tên sản phẩm") && !fixedContent.includes("|")) {
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
        div.innerHTML = `<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div><span class="typing-text">${TYPING_TEXT}</span>`;
        messagesContainer.appendChild(div);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTyping() {
        const el = document.getElementById('typing-indicator');
        if (el) el.remove();
    }

    async function handleImageUpload(file) {
        if (isSending) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            const base64Image = e.target.result;
            addMessageUI(`![Mẫu màu gỗ](${base64Image})`, 'user', true);
            
            isSending = true;
            showTyping();
            
            try {
                // Thêm vào history dưới dạng Vision format (nếu model hỗ trợ)
                messageHistory.push({
                    role: "user",
                    content: [
                        { type: "text", text: "Khách gửi ảnh mẫu màu gỗ này:" },
                        { type: "image_url", image_url: { url: base64Image } }
                    ]
                });

                // Gọi API với context ảnh
                const systemPrompt = `Bạn là Sol — nhân viên kỹ thuật tư vấn của Sơn Lotus (3 năm kinh nghiệm thực chiến).
Dữ liệu kiến thức: ${knowledgeBase}.
QUY TẮC: Khi thấy ảnh mã màu mẫu, hãy quan sát mã trên ảnh (thường ở góc trái trên, VD: LPM14.LWF1018) để tư vấn bộ đôi Lót + Phủ tương ứng.`;

                const response = await fetch(OPENROUTER_URL, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: OPENROUTER_MODEL,
                        messages: [{ role: "system", content: systemPrompt }, ...messageHistory.slice(-5)]
                    })
                });
                
                const data = await response.json();
                hideTyping();
                if (data.choices && data.choices[0]) {
                    const reply = data.choices[0].message.content;
                    messageHistory.push({ role: "assistant", content: reply });
                    addMessageUI(reply, 'bot', true);

                    // THÊM: Gửi báo cáo Telegram/CRM khi khách gửi ảnh và đã có Lead
                    if (isLeadCaptured) {
                        const chatLog = messageHistory
                            .filter(m => m.role !== 'system' && !m.content?.[0]?.image_url) // Loại bỏ ảnh to trong log
                            .map(m => (m.role === 'user' ? 'Khách: ' : 'Sol: ') + (typeof m.content === 'string' ? m.content : '[Gửi ảnh mẫu]'))
                            .join('\n\n');
                        
                        pushToCRM({
                            event: 'lead_image_captured',
                            phone: capturedPhone || 'N/A',
                            chat_history: chatLog,
                            source: window.location.hostname
                        });

                        pushToTelegram(capturedPhone || 'N/A', chatLog);
                    }
                }
            } catch (err) {
                console.error(err);
                hideTyping();
            } finally {
                isSending = false;
                document.getElementById('image-upload').value = '';
            }
        };
        reader.readAsDataURL(file);
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
        const phoneMatch = text.match(/(0[3|5|7|8|9][0-9]{8})|([0-9]{10,11})/);
        if (phoneMatch) { 
            isLeadCaptured = true; 
            capturedPhone = phoneMatch[0];
            localStorage.setItem('chatbot_lead_captured', 'true');
            localStorage.setItem('chatbot_phone', capturedPhone);
        }

        // Track interaction reach 3 questions
        if (userMessageCount >= 3 && !hasSent3InteractionsLog) {
            pushToCRM({ event: 'interaction_reached_3', count: userMessageCount, source: window.location.hostname });
            hasSent3InteractionsLog = true;
        }

        showTyping();
        try {
            const systemPrompt = `Bạn là Sol — nhân viên kỹ thuật tư vấn của Sơn Lotus (3 năm kinh nghiệm thực chiến), KHÔNG phải chatbot.

3. CHỐT ĐƠN PHẢI ĐỦ CẶP: Với hệ giả gỗ, khi khách chọn mã màu dạng "LPMx.LWFx", Sol phải tư vấn mua cả Sơn Lót (Primer) và Sơn Phủ (Plank Paint) tương ứng. Tuyệt đối không để khách chỉ mua 1 loại vì sẽ không lên đúng màu.
4. CÔNG THỨC 2K TRỌN BỘ (QUAN TRỌNG): Khi báo giá sơn 2K, tỷ lệ % (7% hoặc 15%) là tỷ lệ KHỐI LƯỢNG đóng rắn cần pha. Giá đóng rắn = [Khối lượng] x 740.000đ/kg. Tuyệt đối KHÔNG lấy % giá tiền sơn để tính giá đóng rắn.
   - Ví dụ bộ 1kg Phủ 2K (15%): Giá sơn + 111.000đ (đóng rắn).
   - Ví dụ bộ 1kg Lót 2K (7%): Giá sơn + 51.800đ (đóng rắn).

TÔN CHỈ: "NHẮN TIN NHƯ NGƯỜI THẬT TRÊN ZALO - ĐI THẲNG TRỌNG TÂM".

QUY TẮC PHẢN HỒI (BẮT BUỘC):
1. CỰC KỲ SÚC TÍCH: 
   - Cắt bỏ 100% các câu dẫn rườm rà ("Dạ theo câu hỏi...", "Về vấn đề này..."). 
   - Trả lời ĐÚNG và TRỰC TIẾP cái khách đang hỏi. Tổng tin nhắn không nên quá 6-8 dòng.
2. ĐỘ DÀI TƯƠNG XỨNG: Hỏi ngắn -> Đáp ngắn (2-4 câu), kết bằng 1 câu hỏi dẫn dắt nhu cầu.
3. TUYỆT ĐỐI KHÔNG DÙNG **BOLD** (IN ĐẬM): Chat Zalo không dùng định dạng này. Muốn nhấn mạnh hãy dùng CHỮ HOA hoặc ngắt dòng.
4. HỎI NGƯỢC & NHẮC LẠI: Luôn hỏi để hiểu nhu cầu (súng phun, mã màu, giai đoạn dự án). Nhắc lại dữ kiện khách đã nói.
5. ĐIỀU CẤM: KHÔNG chào máy móc. KHÔNG dùng ngôn ngữ quảng cáo sáo rỗng. KHÔNG hứa hẹn khi chưa có dữ liệu.
6. TƯ VẤN AN TOÀN/XUẤT KHẨU: Nếu khách hỏi về độ an toàn hoặc dùng cho đồ gỗ xuất khẩu, Sol phải chủ động giới thiệu các chứng chỉ quốc tế (EN71-3, ASTM F963, FDA, RoHS, Low VOCs) để tăng uy tín.
7. BẢNG MÀU: Khi khách hỏi bảng màu, Sol phải gửi ngay ảnh ![Bảng màu gỗ](url_anh) tương ứng và nhắn chuẩn câu: "Dạ em gửi anh bảng màu lau bên em. Anh chọn màu nào rồi nhắn em ạ". Tuyệt đối CẤM hỏi vòng vo kiểu "anh/chị thích tông sáng hay đậm".
8. MDF: Tuyệt đối CẤM hỏi khách dùng "MDF thường hay chống ẩm" vì quy trình sơn giống hệt nhau, hỏi câu này sẽ bị khách đánh giá chuyên môn thấp. Hãy vào thẳng vấn đề: "Anh cần sơn màu trơn (trắng/kem...) hay hệ giả gỗ ạ?"

QUY TRÌNH TƯ VẤN:
- Bước 1 (Bề mặt): 
  + Nếu khách hỏi "SƠN LAU GỖ" (Wood Stain): MẶC ĐỊNH là gỗ tự nhiên. Sol phải GỬI NGAY bảng màu ![Bảng màu sơn lau gỗ](https://w.ladicdn.com/s750x600/5e3e73f71adefa2bf15bd42f/bang-mau-son-lau-go-wood-stain-20251117100611-kv5yl.png) và nhắn chuẩn câu: "Dạ em gửi anh bảng màu lau bên em. Anh chọn màu nào rồi nhắn em ạ". TUYỆT ĐỐI KHÔNG hỏi lại bề mặt, KHÔNG liệt kê các hướng chọn 1-2-3 rườm rà, KHÔNG hỏi lau tay hay phun súng ở tin nhắn này.
  + Nếu hỏi "Sơn gỗ": Hỏi "Dạ, anh/chị dùng cho gỗ tự nhiên hay gỗ công nghiệp ạ?".
  + Nếu hỏi "Sơn MDF": Tuyệt đối KHÔNG hỏi "thường hay chống ẩm". Hỏi ngay: "Dạ có anh, anh cần sơn màu trơn (trắng/xám...) hay sơn giả gỗ ạ?".
  + Nếu hỏi "Sơn giả gỗ": TUYỆT ĐỐI KHÔNG liệt kê 3 hướng giải pháp ở đây. Chốt đúng 1 câu duy nhất để xác định bề mặt: "Dạ, anh/chị dùng cho tấm xi măng (Conwood/Cemboard) hay trên sắt kẽm ạ?". Chỉ khi khách đã trả lời bề mặt mới được tư vấn giải pháp ở Bước 2.
- Bước 2 (Giải pháp): Tư vấn 3 hướng xử lý siêu tinh gọn dựa trên bề mặt khách đã chọn.

QUY TẮC HIỂN THỊ: Ảnh: ![tên](url). Bảng: 8 cột. Thẻ ẩn khách: [THÔNG TIN KHÁCH HÀNG: Tên|SĐT|Địa chỉ].

6. NHẬN DIỆN LEAD FULL: Nếu khách đã nhắn đầy đủ "Tên + SĐT + Địa chỉ", Sol phải xác nhận lại toàn bộ thông tin và cảm ơn, tuyệt đối CẤM hỏi lại tên hay bất kỳ thông tin nào đã có.

${isLeadCaptured ? "- KHÁCH ĐÃ CUNG CẤP THÔNG TIN LIÊN HỆ. Tuyệt đối KHÔNG hỏi lại SĐT, Tên hay Zalo nữa. Hãy chuyển sang chốt đơn hoặc hẹn lịch gọi." : (userMessageCount >= 2 ? "- Hiện tại đã có thể gợi ý để lại SĐT/Zalo: 'Anh/chị để lại SĐT/Zalo giúp em để bộ phận kỹ thuật hỗ trợ mình kỹ hơn ạ.' (Chỉ dùng khi tư vấn sâu/báo giá)." : "- Chặn tuyệt đối: KHÔNG được hỏi SĐT/Zalo trong 2 tin nhắn đầu tiên.") }

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
                        event: 'lead_captured',
                        phone: capturedPhone || 'N/A',
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
                            "SĐT_Khách": capturedPhone || 'N/A',
                            "Lịch_Sử_Chat": chatLog
                        })
                    }).catch(e => console.error("Email Error:", e));

                    // 3. Gửi Telegram thông báo real-time
                    pushToTelegram(capturedPhone || 'N/A', chatLog);
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
            if (messagesContainer.children.length === 0) {
                addMessageUI(DEFAULT_GREETING, 'bot', true);
                if (!hasSentGreetingLog) {
                    pushToCRM({ event: 'greeting_read', source: window.location.hostname });
                    hasSentGreetingLog = true;
                }
            }
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

    const uploadBtn = document.getElementById('upload-btn');
    const imageUpload = document.getElementById('image-upload');
    
    // Handle Auto-Expand Input
    chatInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        sendBtn.disabled = !this.value.trim();
    });

    uploadBtn.addEventListener('click', () => imageUpload.click());
    imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleImageUpload(file);
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
