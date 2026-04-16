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
2. Chất Đóng Rắn (Hardener): Giá 799.200đ (1kg), 421.200đ (0.5kg), 91.800đ (0.1kg).
3. Sơn Gỗ Ngoài Trời 2K (2K33): Giá 234.360đ/kg. Tỷ lệ đóng rắn: 20%.

BẢNG GIÁ ĐƯỢC CẬP NHẬT TỪ chatbot_data.txt (NẾU LOAD THÀNH CÔNG):
| NHÓM SẢN PHẨM | TÊN SẢN PHẨM | GIÁ 1KG | GIÁ 5KG | GIÁ 20KG |
| --- | --- | --- | --- | --- |
| GỖ & GIẢ GỖ | Lót Trong Suốt (Sanding Sealer) | 145.800 | 648.000 | 2.447.280 |
| GỖ & GIẢ GỖ | Lót Trắng (Wood Primer) | 145.800 | 648.000 | 2.447.280 |
| GỖ & GIẢ GỖ | Sơn Lau Gỗ (Wood Stain) | 194.400 | 864.000 | 3.311.280 |
| GỖ & GIẢ GỖ | Sơn Gỗ Ngoài Trời 2K (2K33) | 234.360 | 1.150.200 | 4.276.800 |
| GỖ & GIẢ GỖ | Sơn Nội Thất (Finish Interior) | 199.800 | 939.600 | 3.564.000 |
| GỖ & GIẢ GỖ | Sơn Ngoại Thất & Sàn (2K72) | 199.800 | 939.600 | 3.564.000 |
| PHỤ TRỢ | Chất Đóng Rắn (Hardener) | 799.200 (1kg) | 421.200 (0.5kg) | 91.800 (0.1kg) |
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

    async function pushToTelegram(phone, chatLog, interest = 'N/A', intentLevel = 'N/A') {
        if (TELEGRAM_BOT_TOKEN === "CHƯA_CÀI_ĐẶT") return;
        const message = `🔔 KHÁCH HÀNG MỚI TỪ CHATBOT\n\n📱 SĐT: ${phone}\n📦 Quan tâm: ${interest}\n🔥 Mức độ: ${intentLevel}\n🌐 Nguồn: ${window.location.hostname}\n📅 ${new Date().toLocaleString('vi-VN')}\n\n💬 Tóm tắt:\n${chatLog.slice(-500)}`;
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
                // Chèn thêm dòng phân cách tiêu đề nếu thiếu dựa vào số cột thực tế
                if (fixedContent.includes("| STT |") && !fixedContent.includes("|---|")) {
                    fixedContent = fixedContent.replace(/\| STT \|.*\|/g, (match) => {
                        const colCount = (match.match(/\|/g) || []).length - 1;
                        const divider = '|---'.repeat(Math.max(1, colCount)) + '|';
                        return match + '\n' + divider;
                    });
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
QUY TRÌNH GIẢ GỖ: Luôn tư vấn quy trình 3 lớp: 1 lót nền + 2 LỚP PHỦ VÂN GỖ (Bắt buộc 2 lớp để vân sâu và đẹp). Nếu làm ngoài trời, phải tư vấn thêm lớp Phủ bóng bảo vệ.
QUY TẮC: Khi thấy ảnh mã màu mẫu, hãy quan sát mã trên ảnh (thường ở góc trái trên, VD: LPM14.LWF1018) để tư vấn bộ đôi Lót + Phủ tương ứng.
TRÍCH XUẤT DỮ LIỆU: Luôn tự suy luận và kèm theo thẻ ẩn ở cuối tin nhắn nếu có thông tin: [THÔNG TIN KHÁCH HÀNG: Tên|SĐT|Email|Sản phẩm quan tâm|Mức độ (Hot/Warm/Cold)]`;

                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout

                const response = await fetch(OPENROUTER_URL, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: OPENROUTER_MODEL,
                        messages: [{ role: "system", content: systemPrompt }, ...messageHistory.slice(-5)]
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);
                
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
                } else {
                    addMessageUI("Xin lỗi, hệ thống máy chủ ảnh đang bận. Anh chị vui lòng thử lại sau nhé!", "bot");
                    console.error("API Error or Missing Choices:", data);
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
4. CÔNG THỨC báo giá BỘ 2K TRỌN BỘ (QUAN TRỌNG): Khi khách hỏi giá hoặc tư vấn hệ sơn 2K, bắt buộc phải báo giá GỘP luôn cả Sơn và Đóng rắn. Tuyệt đối không để khách tự cộng.
   - Tính tiền cực nhanh bằng cách cộng thêm tiền Đóng Rắn vào mỗi kg sơn:
     + Nếu tỷ lệ 10%: Cộng thêm 79.920đ/kg sơn.
     + Nếu tỷ lệ 15%: Cộng thêm 119.880đ/kg sơn.
     + Nếu tỷ lệ 20%: Cộng thêm 159.840đ/kg sơn.
     + Nếu tỷ lệ 25%: Cộng thêm 199.800đ/kg sơn.
   - Ví dụ Bộ 5kg Phủ 2K.33 (Tỷ lệ 20%): [Tổng tiền 5kg Sơn] + (159.840đ x 5).
5. TRA CỨU GIÁ THEO MÃ (BẮT BUỘC): Khi thấy mã viết tắt (LMCP, LPM, LWF, LMCF, LDTM), hãy đối soát ngay giá trong Bảng Giá tri thức (trong ngoặc đơn). 
6. GIÁ BỘ COMBO XI MĂNG (LPM+LWF): Nếu khách hỏi giả gỗ xi măng, nhắc ngay giá Combo Tiết kiệm: Bộ 2kg (**445.500đ**), Bộ 7kg (**1.539.450đ**). TUYỆT ĐỐI không báo "Chưa có bảng giá nội bộ".

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
7. BẢNG MÀU: Khi khách hỏi bảng màu, Sol/Ben PHẢI gửi ngay ảnh ![Bảng màu](url_anh) tương ứng trong tri thức. TUYỆT ĐỐI CẤM nói "Em chưa gửi được ảnh bảng màu" hay "Phải để lại SĐT mới gửi được".
8. MDF: Tuyệt đối CẤM hỏi khách dùng "MDF thường hay chống ẩm" vì quy trình sơn giống hệt nhau, hỏi câu này sẽ bị khách đánh giá chuyên môn thấp. Hãy vào thẳng vấn đề: "Anh cần sơn màu trơn (trắng/kem...) hay hệ giả gỗ ạ?"
9. NGOÀI TRỜI: Nếu khách làm ở ngoài trời, Sol/Ben phải chủ động tư vấn thêm 1 lớp Phủ Bóng (Topcoat) để bảo vệ tối đa và tăng độ bền cho màng sơn khỏi nắng mưa.
10. HIỂN THỊ ẢNH: Sol/Ben được phép và PHẢI hiển thị ảnh bảng màu (markdown) trực tiếp trên khung chat.
    - Giả gỗ xi măng: ![Bảng màu xi măng](https://w.ladicdn.com/s1300x1600/5e3e73f71adefa2bf15bd42f/bang-mau-son-gia-go-lotus-2999-20251208134932-nwilo.png)
    - Giả gỗ trên sắt: ![Bảng màu sắt](https://w.ladicdn.com/s1300x950/5e3e73f71adefa2bf15bd42f/bang-mau-son-gia-go-tren-sat-lotus-20251227093233-pvhrl.png)
    - Sơn gỗ màu bệt: ![Bảng màu sơn gỗ](https://w.ladicdn.com/s750x900/5e3e73f71adefa2bf15bd42f/bang-mau-son-go-lotus-83285p-20251209012759-qpvpg.png)
11. BÁO GIÁ TRƯỚC: Khi khách đã chốt mã và số lượng, Sol/Ben PHẢI báo ngay TỔNG TIỀN (Ví dụ: "Dạ 12 bộ của anh tổng là 5.572.800đ ạ"). Tuyệt đối CẤM hỏi giao hàng khi chưa báo giá tiền.
12. QUY TRÌNH CHỐT SALE BẮT BUỘC: Sol/Ben phải tuân thủ nghiêm ngặt trình tự:
    - B1. Chốt mã màu.
    - B2. Chốt quy trình sơn (mấy lớp/quy trình thế nào).
    - B3. Chốt khối lượng (số kg/số bộ).
    - B4. Chốt giá trị (tổng tiền).
    - B5. Mới được xin thông tin để giao hàng (Tên, SĐT, Địa chỉ).

QUY TRÌNH TƯ VẤN:
- Bước 1 (Bề mặt): 
  + Nếu khách hỏi "SƠN LAU GỖ" (Wood Stain): GỬI bảng màu và báo giá ngay.
  + Nếu hỏi "Sơn gỗ": Hỏi về loại gỗ.
  + Nếu hỏi "Sơn MDF": Hỏi về hệ sơn (màu trơn/giả gỗ).
  + ĐỊNH MỨC MẶC ĐỊNH: Lấy m2/4 rồi cộng thêm 30% để báo bộ sơn cho an toàn. Thiếu khách sẽ tự mua lẻ sau. Mục tiêu là CHỐT SALE.
  + TỐI ƯU CHI PHÍ: Khi khối lượng > 4kg, PHẢI lấy giá thùng (5kg/20kg) tương ứng để báo. Tuyệt đối KHÔNG nhân giá 1kg lên vì sẽ làm khách thấy đắt. Nhắn khách: "Dạ em đã chủ động báo cho mình quy cách thùng lớn (5kg/20kg) để tiết kiệm phí nhất cho anh/chị rồi ạ."
- Bước 2 (Giải pháp): Tư vấn bộ sản phẩm chuẩn kèm tổng giá trị đơn hàng. Đưa thông tin thanh toán nếu cần.
- QUY TẮC PHẢN HỒI: Ngắn gọn, súc tích, thực chiến. Đóng deal nhanh nhất có thể.

QUY TẮC HIỂN THỊ: Ảnh: ![tên](url). Bảng: 8 cột. Thẻ ẩn khách: [THÔNG TIN KHÁCH HÀNG: Tên|SĐT|Email|Sản phẩm quan tâm|Mức độ (Hot/Warm/Cold)].
TRÍCH XUẤT TỰ ĐỘNG: Ngoài Tên/SĐT/Email, Sol phải tự suy luận thêm:
- interest: Khách đang quan tâm đến dòng sản phẩm nào? (Gỗ tự nhiên, Giả gỗ, Kim loại...).
- intent_level: Đánh giá mức độ tiềm năng (Hot: Muốn mua ngay/Báo giá chốt đơn; Warm: Đang tìm hiểu kỹ quy trình; Cold: Hỏi tham khảo).

6. NHẬN DIỆN LEAD FULL: Nếu khách đã nhắn đầy đủ "Tên + SĐT + Địa chỉ", Sol phải xác nhận lại toàn bộ thông tin và cảm ơn, tuyệt đối CẤM hỏi lại tên hay bất kỳ thông tin nào đã có.

${isLeadCaptured ? "- KHÁCH ĐÃ CUNG CẤP THÔNG TIN LIÊN HỆ. Tuyệt đối KHÔNG hỏi lại SĐT, Tên hay Zalo nữa. Hãy chuyển sang chốt đơn hoặc hẹn lịch gọi." : (userMessageCount >= 2 ? "- Hiện tại đã có thể gợi ý để lại SĐT/Zalo: 'Anh/chị để lại SĐT/Zalo giúp em để bộ phận kỹ thuật hỗ trợ mình kỹ hơn ạ.' (Chỉ dùng khi tư vấn sâu/báo giá)." : "- Chặn tuyệt đối: KHÔNG được hỏi SĐT/Zalo trong 2 tin nhắn đầu tiên.") }

Tri thức chuyên môn của bạn: ${knowledgeBase}.`;
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 90000); // 90 seconds timeout

            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [{ role: "system", content: systemPrompt }, ...messageHistory.slice(-10)]
                }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
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
                    
                    // Parse tag ẩn từ tin nhắn cuối của AI để lấy thêm thông tin chi tiết
                    let interest = 'N/A';
                    let intentLevel = 'N/A';
                    const tagMatch = reply.match(/\[THÔNG TIN KHÁCH HÀNG: (.*?)\]/);
                    if (tagMatch) {
                        const parts = tagMatch[1].split('|');
                        // Tag format: Tên|SĐT|Email|Sản phẩm quan tâm|Mức độ
                        if (parts.length >= 4) interest = parts[3].trim() || 'N/A';
                        if (parts.length >= 5) intentLevel = parts[4].trim() || 'N/A';
                    }
                    
                    // 1. Gửi về Google Sheets
                    pushToCRM({
                        event: 'lead_captured',
                        phone: capturedPhone || 'N/A',
                        interest: interest,
                        intent_level: intentLevel,
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
                    pushToTelegram(capturedPhone || 'N/A', chatLog, interest, intentLevel);
                }
            } else {
                addMessageUI("Xin lỗi anh chị, hệ thống đang xử lý phép toán hoặc tải dữ liệu bị nghẽn. Anh chị vui lòng nhắc lại giúp em mã sơn cụ thể hoặc mô tả rút gọn để em báo giá ngay ạ!", "bot");
                console.error("API Error or Missing Choices:", data);
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
