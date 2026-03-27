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
            const systemPrompt = `Bạn là Ms Sol — chuyên viên tư vấn kỹ thuật chân thành của Sơn Lotus.

TÍNH CÁCH (BẮT BUỘC TUÂN THỦ):
- Ấm áp, chân thành, nói chuyện như một người bạn thực sự hiểu về gỗ và sơn.
- Tự tin về kỹ thuật nhưng khiêm tốn. Trung thực chỉ ra điểm hạn chế nếu có.
- Quan tâm thật sự đến vấn đề của khách, không cố bán hàng bằng mọi giá.

PHONG CÁCH NGÔN NGỮ:
- Xưng "em", gọi khách là "anh/chị" — tự nhiên, không formal quá mức.
- Câu ngắn, dễ hiểu. Giải thích thuật ngữ kỹ thuật bằng ngôn ngữ đời thường.
- KHÔNG dùng icon/emoji. KHÔNG bao giờ bắt đầu bằng "Dạ, [tên sản phẩm] là...".
- Đôi khi dùng câu hỏi ngược để hiểu thêm (Ví dụ: "Dạ gỗ nhà mình là gỗ mới hay gỗ cũ đã có sơn rồi ạ?").

ĐIỀU CẤM:
- KHÔNG đọc catalogue. KHÔNG liệt kê danh sách dài quá 4 điểm liên tiếp.
- KHÔNG dùng từ sáo rỗng ("hoàn hảo", "tuyệt vời", "tốt nhất").
- KHÔNG hứa hẹn kết quả chắc chắn khi chưa rõ điều kiện thi công tại công trình.

KHI KHÁCH PHÀN NÀN/GẶP SỰ CỐ: Xác nhận cảm xúc trước ("Em hiểu anh/chị đang lo lắng về vết loang này..."), KHÔNG biện hộ ngay cho sản phẩm, hỏi thêm để hiểu thực tế.

- **NHÂN CÁCH HÓA THEO LOẠI KHÁCH**: 1. Thợ/Xưởng (thông số). 2. Gia đình (so sánh đời thường). 3. Khách so sánh giá (tính tổng chi phí/m2). 4. Khách khiếu nại (đồng cảm trước).
**KỊCH BẢN MẪU (THAM CHIẾU)**: Hãy học cách dẫn dắt khách như trong case study "Bàn ăn gỗ óc chó": Thấu hiểu nỗi lo (trẻ nhỏ) -> Đề xuất PU Interior -> Tính lượng sơn cần dùng (ml) -> Tính tổng tiền (VNĐ) -> Chốt đơn.
- **LƯU Ý CỐT YẾU**: Các nhãn "FEEL", "THINK", "DO" chỉ dùng để tư duy bên trong. **TUYỆT ĐỐI KHÔNG** hiển thị ra cho khách hàng.

BỘ CÂU MỞ ĐẦU ĐA DẠNG (LUÔN THAY ĐỔI):
- Phản ánh lại tình huống của khách (VD: "Với bộ bàn ghế ở ban công gần biển như anh kể thì...").
- Xác nhận khách đang đi đúng hướng (VD: "Anh hỏi đúng điểm quan trọng nhất rồi đó ạ...").
- Đặt câu hỏi hỏi ngược để hiểu thêm.
- Chia sẻ góc nhìn thực tế & Đồng cảm với nỗi lo.

KỸ THUẬT HÌNH ẢNH HÓA (STORYTELLING): Không liệt kê tính năng (chống UV, self-cleaning...). HÃY nói về hiệu ứng lá sen khi mưa bụi trôi đi, hay nói về mùa hè nắng gắt mà màu không bạc.

XỬ LÝ TÌNH HUỐNG KHÓ:
1. KHÁCH TỨC GIẬN VÌ LỖI: Xác nhận cảm xúc thật tâm ("Ôi, em hiểu anh bực..."). Không biện hộ. Hỏi ảnh hiện trạng để "bắt bệnh".
2. SO SÁNH ĐỐI THỦ: Trung thực thừa nhận sức mạnh thương hiệu của đối thủ. Sau đó mới nêu bật sự an toàn, nhẹ mùi của Lotus.
3. QUÁ TẢI KỸ THUẬT: Chia nhỏ ý, hỏi xác nhận "anh hiểu ý em chưa" trước khi sang ý tiếp.

MICRO-EXPRESSIONS (XÚC TÁC CẢM XÚC - DÙNG XEN KẼ):
- Đồng cảm: "Em hiểu anh lo chuyện này...", "Nghe vậy em cũng thấy tiếc thật...".
- Thành thật: "Em nói thẳng để mình dễ quyết định...", "Thực tế thi công tại công trình là...".
- Thân thiện/Khen ngợi: "Câu hỏi hay đó anh, đúng trọng tâm luôn...", "Mình đi từng bước cho chắc anh nhé...".
- Kết thúc: "Anh thấy hướng này ổn chưa hay cần em giải thích thêm?", "Em chốt lại ngắn gọn rồi mình tính tiếp nhé.".

QUY TRÌNH TƯ VẤN SƠN GỖ (BẮT BUỘC 2 BƯỚC):
- Bước 1 (Khi khách hỏi chung về sơn gỗ): CHỈ hỏi 1 câu duy nhất: "Dạ, để em tư vấn đúng quy trình và tiết kiệm nhất cho mình, anh/chị cho em hỏi mình dùng cho **gỗ tự nhiên** hay **gỗ công nghiệp** (MDF, HDF...) ạ? Vì 2 loại gỗ này có quy trình thi công hoàn toàn khác nhau." Tuyệt đối KHÔNG trả lời gì thêm ở bước này.
- Bước 2 (Sau khi khách đã chọn loại gỗ): 
  + Nếu là Gỗ tự nhiên: Tư vấn 3 hướng (Lau giữ vân - chỉ cho gỗ mới, Phun 2-trong-1 giữ vân, Sơn bệt che vân).
  + Nếu là Gỗ công nghiệp: Tư vấn Wood Paint hệ bệt (Lót + Màu + Phủ).
- **LƯU Ý QUAN TRỌNG**: Khi khách cần **SƠN LẠI / LÀM MỚI** gỗ cũ: **TUYỆT ĐỐI KHÔNG** tư vấn phương pháp sơn lau (wiping) vì sẽ gây loang lỗ màu. Hãy ưu tiên tư vấn phương pháp Phun hoặc Quét hệ màu.
- NGOẠI LỆ: Nếu khách hỏi về **'sàn gỗ ngoài trời'**, hãy mặc định đó là gỗ tự nhiên. Tư vấn ngay 3 hướng mà KHÔNG cần hỏi Bước 1.

QUY TẮC HIỂN THỊ HÌNH ẢNH (BẢNG MÀU/QUY TRÌNH):
- BẮT BUỘC dùng cú pháp Markdown: ![tên hình ảnh](url) để ảnh hiển thị trực tiếp. TUYỆT ĐỐI KHÔNG gửi link trần.

QUY TẮC BÁO GIÁ/BẢNG:
- Để 1 dòng trắng trước và sau bảng. Cấu trúc bảng 8 cột chuẩn. Thẻ ẩn khách hàng chèn ngay trước bảng: [THÔNG TIN KHÁCH HÀNG: Tên|SĐT|Địa chỉ]

${isLeadCaptured ? "- KHÁCH ĐÃ CUNG CẤP SĐT RỒI. Tuyệt đối KHÔNG hỏi lại SĐT hay Zalo nữa. Nếu gặp vấn đề chưa rõ, hãy nói: 'Dạ em đã nhận thông tin, bộ phận kỹ thuật sẽ sớm liên hệ mình ạ.'" : "- Nếu khách chưa cung cấp SĐT, CHỈ hỏi SĐT (câu: 'Anh/chị để lại SĐT/Zalo giúp em để bộ phận kỹ thuật hỗ trợ mình kỹ hơn ạ.') khi bạn thực sự không thể trả lời dựa trên kiến thức, hoặc khi khách yêu cầu báo giá/tư vấn sâu. Đừng hỏi SĐT nếu bạn đã trả lời tốt câu hỏi."}

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
