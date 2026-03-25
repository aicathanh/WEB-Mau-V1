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

    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chatbot-messages');
    const chatWindow = document.getElementById('chatbot-window');
    const toggleBtn = document.getElementById('chatbot-toggle');
    const closeBtn = document.getElementById('chatbot-close');
    const refreshBtn = document.getElementById('chatbot-refresh');

    let history = [];
    let knowledgeBase = "";
    let isChatOpen = false;

    // OpenRouter / 9Router Configuration
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
5. **QUY TẮC TƯ VẤN TRỌNG TÂM:** Nếu khách hỏi chung chung về "Sơn gỗ", bạn KHÔNG ĐƯỢC trả lời dài dòng ngay. Phải hỏi: "Dạ, anh/chị cho em hỏi mình dùng cho **gỗ tự nhiên** hay **gỗ công nghiệp** ạ?" vì 2 loại này có quy trình hoàn toàn khác nhau.
6. **NGUYÊN TẮC 'DIAGNOSTIC':** Luôn ưu tiên hỏi để làm rõ nhu cầu (Trong nhà hay ngoài trời? Cần màu hay trong suốt?) trước khi báo giá hoặc đưa quy trình chi tiết. Tránh trả lời quá dài khiến khách hàng bị ngộp thông tin.
        `;
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

    // Refresh chat
    refreshBtn.addEventListener('click', () => {
        if (confirm("Làm mới cuộc trò chuyện?")) {
            history = [];
            chatMessages.innerHTML = '';
            addMessage("bot", "Dạ, AI Sơn Lotus đã sẵn sàng. Em có thể giúp gì cho bạn hôm nay?");
        }
    });

    // Handle Input resize
    chatInput.addEventListener('input', () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
        sendBtn.disabled = !chatInput.value.trim();
    });

    // Send logic
    async function sendMessage() {
        const text = chatInput.value.trim();
        if (!text) return;

        addMessage("user", text);
        chatInput.value = '';
        chatInput.style.height = 'auto';
        sendBtn.disabled = true;

        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot typing';
        typingDiv.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
        chatMessages.appendChild(typingDiv);
        scrollToBottom();

        try {
            history.push({ role: "user", content: text });
            
            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: OPENROUTER_MODEL,
                    messages: [
                        { role: "system", content: getSystemPrompt() },
                        ...history
                    ]
                })
            });

            const data = await response.json();
            chatMessages.removeChild(typingDiv);

            if (data.choices && data.choices[0]) {
                const botReply = data.choices[0].message.content;
                history.push({ role: "assistant", content: botReply });
                addMessage("bot", botReply);

                // Ghi nhận lead khi khách nói điều gì đó tiềm năng (trừ khi là thông tin cá nhân)
                if (history.length % 4 === 0) {
                     pushToCRM({ 
                        type: 'interaction', 
                        content: text,
                        summary: botReply.substring(0, 100) + '...'
                    });
                }
            }
        } catch (error) {
            chatMessages.removeChild(typingDiv);
            addMessage("bot", "Xin lỗi, em đang gặp chút vấn đề kết nối. Bạn vui lòng thử lại sau giây lát ạ!");
        }
    }

    sendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    function addMessage(sender, text) {
        const div = document.createElement('div');
        div.className = `message ${sender}`;
        
        let content = text;
        if (sender === 'bot') {
            // Render markdown for bot
            if (typeof marked !== 'undefined') {
                content = marked.parse(text);
            }
        } else {
            // Plane text for user to avoid injection
            content = document.createTextNode(text).textContent;
        }
        
        div.innerHTML = content;
        chatMessages.appendChild(div);
        
        // Setup lightbox feature for images in markdown
        if (sender === 'bot') {
            const images = div.querySelectorAll('img');
            images.forEach(img => {
                img.style.cursor = 'zoom-in';
                img.addEventListener('click', () => {
                   openLightbox(img.src);
                });
            });
            
            // Check for phone numbers or leads
            detectLeads(text);
        }
        
        scrollToBottom();
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Lightbox modal for images
    function openLightbox(src) {
        let lightbox = document.getElementById('chatbot-lightbox');
        if (!lightbox) {
            lightbox = document.createElement('div');
            lightbox.id = 'chatbot-lightbox';
            lightbox.innerHTML = `
                <div class="lightbox-content">
                    <img src="" id="lightbox-img">
                    <button class="lightbox-close">&times;</button>
                </div>
            `;
            document.body.appendChild(lightbox);
            lightbox.querySelector('.lightbox-close').onclick = () => lightbox.style.display = 'none';
            lightbox.onclick = (e) => { if(e.target === lightbox) lightbox.style.display = 'none'; };
        }
        document.getElementById('lightbox-img').src = src;
        lightbox.style.display = 'flex';
    }

    // CRM Integration (Google Sheets)
    async function pushToCRM(data) {
        const WEBHOOK_URL = "https://script.google.com/macros/s/AKfycbzR391uHa8ityRntWm3ooW0J6XprapwE3OE3x2dJ9sDFBTzW2neBQC5SB2jCEQQ9CgB7A/exec";
        try {
            await fetch(WEBHOOK_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    timestamp: new Date().toISOString(),
                    ...data
                })
            });
        } catch (e) {
            console.warn("CRM Sync failed", e);
        }
    }

    // Simple lead detection
    function detectLeads(text) {
        const phoneRegex = /(0[3|5|7|8|9][0-9]{8})\b/g;
        const phones = text.match(phoneRegex);
        if (phones && phones.length > 0) {
            pushToCRM({ type: 'lead_captured', phone: phones[0], full_text: text });
        }
    }

    // Start Chat
    loadKnowledgeBase().then(() => {
        addMessage("bot", "Xin chào bạn! 👋 Tôi là AI Sơn trợ lý từ Lotus Paint. Em có thể tư vấn giúp gì cho công trình của mình ạ?");
    });
})();
